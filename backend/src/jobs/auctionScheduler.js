import prisma from "../libs/prisma.js";
import { logActivity, SYSTEM_ACTOR } from "../libs/activityLog.js";
import { closeAuctionLots, startOpeningLot } from "../services/liveAuction.services.js";
import { flushPendingAuctions, PROXY_CUTOFF_MS, syncAuctionBidding, syncDirtyLots } from "../services/bidding.services.js";
import { notifyLotWinner } from "../services/auctionMail.services.js";

/**
 * Every tick:
 *   - ends LIVE / PAUSED auctions once their end time passes, closing their lots (see closeAuctionLots)
 *     and saving their bids from Redis to the database (see syncAuctionBidding)
 *   - puts SCHEDULED / PREVIEW auctions live once their start time passes, and starts
 *     the opening lot (see startOpeningLot)
 *   - switches proxy bidding off for auctions starting within 8 hours
 *   - copies live lots' current bids to the database, and retries any bid saves that failed
 * Scheduled auctions already past their end time are left as they are — staff decide
 * what to do with a sale that never ran.
 */

const TICK_MS = 30_000;
const STARTABLE_AUCTION_STATUSES = ["SCHEDULED", "PREVIEW"];
const ENDABLE_AUCTION_STATUSES = ["LIVE", "PAUSED"];

const lockAuction = (tx, auctionId) =>
    // Lock the row so a manual status change, a lot start/stop (or another server) can't race us
    tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;

const goLive = (auctionId, now) =>
    prisma.$transaction(
        async (tx) => {
            await lockAuction(tx, auctionId);

            const auction = await tx.auction.findUnique({
                where: { id: auctionId },
                select: { title: true, status: true, startTime: true, endTime: true, deletedAt: true },
            });
            if (
                !auction ||
                auction.deletedAt ||
                !STARTABLE_AUCTION_STATUSES.includes(auction.status) ||
                auction.startTime > now ||
                auction.endTime <= now
            ) {
                return null;
            }

            await tx.auction.update({ where: { id: auctionId }, data: { status: "LIVE" } });
            await tx.auctionStatusHistory.create({
                data: {
                    auctionId,
                    fromStatus: auction.status,
                    toStatus: "LIVE",
                    changedBy: null,
                    reason: "Started automatically at the scheduled start time",
                },
            });

            const lot = await startOpeningLot(tx, auctionId, now);
            return { title: auction.title, lot };
        },
        { maxWait: 10_000, timeout: 20_000 }
    );

const endSale = (auctionId, now) =>
    prisma.$transaction(
        async (tx) => {
            await lockAuction(tx, auctionId);

            const auction = await tx.auction.findUnique({
                where: { id: auctionId },
                select: { title: true, status: true, endTime: true, deletedAt: true },
            });
            if (
                !auction ||
                auction.deletedAt ||
                !ENDABLE_AUCTION_STATUSES.includes(auction.status) ||
                auction.endTime > now
            ) {
                return null;
            }

            await tx.auction.update({ where: { id: auctionId }, data: { status: "ENDED" } });
            await tx.auctionStatusHistory.create({
                data: {
                    auctionId,
                    fromStatus: auction.status,
                    toStatus: "ENDED",
                    changedBy: null,
                    reason: "Ended automatically at the scheduled end time",
                },
            });

            const closed = await closeAuctionLots(tx, auctionId);
            return { title: auction.title, ...closed };
        },
        { maxWait: 10_000, timeout: 20_000 }
    );

// the live lot sold as the sale ended: tell the buyer, now the end is committed
const endSaleAndNotify = async (auctionId, now) => {
    const result = await endSale(auctionId, now);
    if (result?.liveLot?.status === "SOLD") notifyLotWinner(result.liveLot.uuid);
    return result;
};

// Live bidding follows the auction's new status. Also runs after a failed end,
// which may have stopped bids on the live lot.
const syncBidding = (uuid) =>
    syncAuctionBidding(uuid).catch((err) => console.error(`[scheduler] could not sync bidding for auction ${uuid}:`, err));

const logSystem = (activity, uuid, title, description, success = true) =>
    logActivity({
        actor: SYSTEM_ACTOR,
        module: "SYSTEM",
        action: success ? activity : `${activity}_FAILED`,
        description,
        success,
        targetType: "AUCTION",
        targetId: uuid,
        targetLabel: title,
    });

const runDue = async (label, activity, where, action, describe) => {
    const now = new Date();
    const due = await prisma.auction.findMany({
        where: { deletedAt: null, ...where(now) },
        select: { id: true, uuid: true, title: true },
    });

    for (const { id, uuid, title } of due) {
        try {
            const result = await action(id, now);
            if (result) {
                console.info(`[scheduler] ${describe(result)}`);
                await logSystem(activity, uuid, title, describe(result));
                await syncBidding(uuid);
            }
        } catch (err) {
            console.error(`[scheduler] failed to ${label} auction ${id}:`, err);
            await logSystem(activity, uuid, title, `Could not ${label} "${title}" automatically: ${err.message}`, false);
            await syncBidding(uuid);
        }
    }
};

const endDueAuctions = () =>
    runDue(
        "end",
        "AUCTION_AUTO_END",
        (now) => ({ status: { in: ENDABLE_AUCTION_STATUSES }, endTime: { lte: now } }),
        endSaleAndNotify,
        ({ title, liveLot, unoffered }) =>
            `"${title}" has ENDED` +
            (liveLot ? ` — closed lot #${liveLot.itemNumber} as ${liveLot.status}` : "") +
            (unoffered ? ` — ${unoffered} unoffered lot(s) marked UNSOLD` : "")
    );

const startDueAuctions = () =>
    runDue(
        "start",
        "AUCTION_AUTO_START",
        (now) => ({ status: { in: STARTABLE_AUCTION_STATUSES }, startTime: { lte: now }, endTime: { gt: now } }),
        goLive,
        ({ title, lot }) => `"${title}" is now LIVE` + (lot ? ` — opened lot #${lot.itemNumber}` : " — no lot to open")
    );

// Proxy bids close 8h before an auction starts: switch them off once that window opens.
// Proxies already left stay and still bid when their lot opens.
const PROXY_SWITCHABLE_STATUSES = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

const closeDueProxyBidding = async () => {
    const now = new Date();
    const due = await prisma.auction.findMany({
        where: {
            deletedAt: null,
            proxyBiddingEnabled: true,
            status: { in: PROXY_SWITCHABLE_STATUSES },
            startTime: { lte: new Date(now.getTime() + PROXY_CUTOFF_MS) },
        },
        select: { id: true, uuid: true, title: true },
    });

    for (const { id, uuid, title } of due) {
        try {
            // only flip it if nobody changed it meanwhile
            const { count } = await prisma.auction.updateMany({
                where: { id, proxyBiddingEnabled: true },
                data: { proxyBiddingEnabled: false },
            });
            if (count) {
                const description = `Proxy bidding for "${title}" switched off automatically 8 hours before the start`;
                console.info(`[scheduler] ${description}`);
                await logSystem("AUCTION_PROXY_AUTO_OFF", uuid, title, description);
            }
        } catch (err) {
            console.error(`[scheduler] failed to switch off proxy bidding for auction ${id}:`, err);
            await logSystem("AUCTION_PROXY_AUTO_OFF", uuid, title, `Could not switch off proxy bidding for "${title}": ${err.message}`, false);
        }
    }
};

let running = false;

const tick = async () => {
    if (running) return; // previous tick still going
    running = true;
    try {
        // End first, so a sale finishing as the next one opens is cleared off the floor
        await endDueAuctions();
        await startDueAuctions();
        await closeDueProxyBidding();
        await syncDirtyLots();
        await flushPendingAuctions();
    } catch (err) {
        console.error("[scheduler] tick failed:", err);
    } finally {
        running = false;
    }
};

export const startAuctionScheduler = () => {
    tick();
    return setInterval(tick, TICK_MS);
};
