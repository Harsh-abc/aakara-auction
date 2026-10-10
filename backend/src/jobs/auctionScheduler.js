import prisma from "../libs/prisma.js";
import { closeAuctionLots, startOpeningLot } from "../services/liveAuction.services.js";

/**
 * Every tick:
 *   - ends LIVE / PAUSED auctions once their end time passes, closing their lots (see closeAuctionLots)
 *   - puts SCHEDULED / PREVIEW auctions live once their start time passes, and starts
 *     the opening lot (see startOpeningLot)
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

const runDue = async (label, where, action, describe) => {
    const now = new Date();
    const due = await prisma.auction.findMany({ where: { deletedAt: null, ...where(now) }, select: { id: true } });

    for (const { id } of due) {
        try {
            const result = await action(id, now);
            if (result) console.info(`[scheduler] ${describe(result)}`);
        } catch (err) {
            console.error(`[scheduler] failed to ${label} auction ${id}:`, err);
        }
    }
};

const endDueAuctions = () =>
    runDue(
        "end",
        (now) => ({ status: { in: ENDABLE_AUCTION_STATUSES }, endTime: { lte: now } }),
        endSale,
        ({ title, liveLot, unoffered }) =>
            `"${title}" has ENDED` +
            (liveLot ? ` — closed lot #${liveLot.itemNumber} as ${liveLot.status}` : "") +
            (unoffered ? ` — ${unoffered} unoffered lot(s) marked UNSOLD` : "")
    );

const startDueAuctions = () =>
    runDue(
        "start",
        (now) => ({ status: { in: STARTABLE_AUCTION_STATUSES }, startTime: { lte: now }, endTime: { gt: now } }),
        goLive,
        ({ title, lot }) => `"${title}" is now LIVE` + (lot ? ` — opened lot #${lot.itemNumber}` : " — no lot to open")
    );

let running = false;

const tick = async () => {
    if (running) return; // previous tick still going
    running = true;
    try {
        // End first, so a sale finishing as the next one opens is cleared off the floor
        await endDueAuctions();
        await startDueAuctions();
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
