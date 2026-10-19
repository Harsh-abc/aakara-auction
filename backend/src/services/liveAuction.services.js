import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { freezeLotBidding, syncLotBidding } from "./bidding.services.js";

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Auctions shown on the live floor */
const FLOOR_AUCTION_STATUSES = ["LIVE", "PAUSED"];

/** Lots that can be put live (UNSOLD = re-offer a lot that got no bids) */
const STARTABLE_LOT_STATUSES = ["DRAFT", "SCHEDULED", "UNSOLD"];

/** Lots that are finished */
const CLOSED_LOT_STATUSES = ["SOLD", "UNSOLD", "PASSED", "WITHDRAWN"];

const displayName = (user) => {
    const p = user?.profile;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return p?.displayName || full || user?.username || null;
};

// =====================================================================
// GET LIVE AUCTIONS (bidding floors)
// =====================================================================

export const getLiveAuctionsService = async () => {
    const auctions = await prisma.auction.findMany({
        where: { deletedAt: null, status: { in: FLOOR_AUCTION_STATUSES } },
        orderBy: { startTime: "asc" },
        select: {
            id: true,
            uuid: true,
            title: true,
            status: true,
            auctionType: true,
            coverImageUrl: true,
            startTime: true,
            endTime: true,
            currency: { select: { code: true, symbol: true } },
            creator: {
                select: {
                    username: true,
                    profile: { select: { displayName: true, firstName: true, lastName: true } },
                },
            },
            items: {
                select: {
                    uuid: true,
                    itemNumber: true,
                    title: true,
                    status: true,
                    startingPrice: true,
                    estimateLow: true,
                    estimateHigh: true,
                    currency: { select: { code: true } },
                },
                orderBy: { itemNumber: "asc" },
            },
        },
    });

    // Verified bidders per auction (a user verified on several lots counts once)
    const verified = await prisma.lotBidder.findMany({
        where: { status: "VERIFIED", item: { auctionId: { in: auctions.map((a) => a.id) } } },
        select: { userId: true, item: { select: { auctionId: true } } },
    });
    const biddersByAuction = new Map();
    for (const row of verified) {
        const key = row.item.auctionId.toString();
        if (!biddersByAuction.has(key)) biddersByAuction.set(key, new Set());
        biddersByAuction.get(key).add(row.userId.toString());
    }

    return serializeBigInt(
        auctions.map(({ id, items, creator, currency, ...auction }) => {
            const code = currency.code;
            const liveLot = items.find((lot) => lot.status === "ACTIVE") ?? null;

            // Estimate in the auction's primary currency only (no FX conversion)
            const sameCurrency = items.filter((lot) => (lot.currency?.code ?? code) === code);
            const sum = (pick) => sameCurrency.reduce((total, lot) => total + (Number(pick(lot)) || 0), 0);

            return {
                ...auction,
                currency,
                auctioneer: displayName(creator),
                lotCount: items.length,
                closedLots: items.filter((lot) => CLOSED_LOT_STATUSES.includes(lot.status)).length,
                liveLot: liveLot && { uuid: liveLot.uuid, itemNumber: liveLot.itemNumber, title: liveLot.title },
                verifiedBidders: biddersByAuction.get(id.toString())?.size ?? 0,
                estimate: {
                    low: sum((lot) => lot.estimateLow ?? lot.startingPrice),
                    high: sum((lot) => lot.estimateHigh ?? lot.estimateLow ?? lot.startingPrice),
                    currency: code,
                },
            };
        })
    );
};

// =====================================================================
// OPENING LOT (when an auction goes live)
// Only one lot is started: the first lot whose own window covers `now`,
// else the first lot by number. Staff start / stop the rest by hand.
// Call inside a transaction that already locked the auction row.
// =====================================================================

/** Lots that can open a sale (UNSOLD only comes later, as a re-offer) */
const OPENING_LOT_STATUSES = ["DRAFT", "SCHEDULED"];

export const startOpeningLot = async (tx, auctionId, now = new Date()) => {
    const live = await tx.auctionItem.findFirst({
        where: { auctionId, status: "ACTIVE" },
        select: { id: true },
    });
    if (live) return null;

    const lots = await tx.auctionItem.findMany({
        where: { auctionId, status: { in: OPENING_LOT_STATUSES } },
        orderBy: { itemNumber: "asc" },
        select: { id: true, scheduledStartAt: true, scheduledEndAt: true },
    });
    if (lots.length === 0) return null;

    const onTime = lots.find((lot) => lot.scheduledStartAt <= now && now < lot.scheduledEndAt);
    const lot = onTime ?? lots[0];

    return tx.auctionItem.update({
        where: { id: lot.id },
        data: { status: "ACTIVE" },
        select: { uuid: true, itemNumber: true, title: true, status: true },
    });
};

// =====================================================================
// CLOSING LOTS (stopping a lot, or when an auction ends)
// =====================================================================

/** Status a live lot closes with: sold if the top bid meets the reserve */
const closedLotStatus = (lot) => {
    const hasBid = Number(lot.bidCount) > 0 && lot.currentBid !== null;
    const reserveMet = hasBid && (lot.reservePrice === null || Number(lot.currentBid) >= Number(lot.reservePrice));
    return reserveMet ? "SOLD" : hasBid ? "PASSED" : "UNSOLD";
};

const roundMoney = (value) => Math.round(value * 100) / 100;

/**
 * Writes the winner of a sold lot: hammer price, buyer's premium (the sale's
 * active BUYER_PREMIUM fees) and the total due. The winning bid is linked once
 * the sale's bids are written to the database (see persistLot).
 */
const recordWinner = async (tx, { auctionId, itemId, winnerId, hammerPrice }) => {
    if (!winnerId || hammerPrice === null || hammerPrice === undefined) return null;

    const hammer = Number(hammerPrice);
    const fees = await tx.auctionFee.findMany({
        where: { auctionId, feeType: "BUYER_PREMIUM", isActive: true },
        select: { calculationType: true, value: true },
    });
    const premium = roundMoney(
        fees.reduce((sum, fee) => sum + (fee.calculationType === "PERCENTAGE" ? (hammer * Number(fee.value)) / 100 : Number(fee.value)), 0)
    );
    const amounts = {
        winnerId,
        finalHammerPrice: String(hammer),
        buyerPremiumAmount: String(premium),
        totalAmountDue: String(roundMoney(hammer + premium)),
        wonAt: new Date(),
    };

    return tx.auctionWinner.upsert({
        where: { itemId },
        create: { auctionId, itemId, ...amounts },
        update: amounts,
        select: { finalHammerPrice: true, buyerPremiumAmount: true, totalAmountDue: true },
    });
};

/**
 * Runs a closing transaction for a lot (`work` gets an onFrozen callback for when its bids
 * were stopped). On success the lot's new state is published; if the transaction fails
 * after bids were stopped, the lot is reopened — it's still live in the database.
 */
const closingLot = async (lotUuid, work) => {
    let frozen = false;

    try {
        const result = await work(() => (frozen = true));
        // open the lot for bids (proxies wait for the hammer) or publish its result
        await syncLotBidding(lotUuid).catch((error) => console.error(`[bidding] could not sync lot ${lotUuid}:`, error));
        return result;
    } catch (error) {
        if (frozen) await syncLotBidding(lotUuid).catch((err) => console.error(`[bidding] could not reopen lot ${lotUuid}:`, err));
        throw error;
    }
};

/**
 * Closes every open lot of an ending auction: the live lot closes as if stopped,
 * lots never offered become UNSOLD. Call inside a transaction that already locked the auction row;
 * if it fails, call syncAuctionBidding so the live lot takes bids again.
 */
export const closeAuctionLots = async (tx, auctionId) => {
    const live = await tx.auctionItem.findFirst({
        where: { auctionId, status: "ACTIVE" },
        select: { id: true, uuid: true, currentBid: true, currentBidderId: true, reservePrice: true, bidCount: true },
    });

    let liveLot = null;
    if (live) {
        // bids are settled in Redis — stop them and close on the final position
        const final = await freezeLotBidding(live.uuid);
        const closed = { ...live, ...final };
        liveLot = await tx.auctionItem.update({
            where: { id: live.id },
            data: { status: closedLotStatus(closed), ...final },
            select: { itemNumber: true, status: true },
        });
        if (liveLot.status === "SOLD") {
            await recordWinner(tx, { auctionId, itemId: live.id, winnerId: closed.currentBidderId, hammerPrice: closed.currentBid });
        }
    }

    const { count: unoffered } = await tx.auctionItem.updateMany({
        where: { auctionId, status: { in: OPENING_LOT_STATUSES } },
        data: { status: "UNSOLD" },
    });

    return { liveLot, unoffered };
};

// =====================================================================
// START / STOP A LOT
// Only one lot per auction can be live (ACTIVE) at a time.
// =====================================================================

export const setLotLiveService = ({ lotUuid, action }) =>
    closingLot(lotUuid, (onFrozen) => setLotLiveTx({ lotUuid, action, onFrozen }));

const setLotLiveTx = ({ lotUuid, action, onFrozen }) =>
    prisma.$transaction(
        async (tx) => {
            const ref = await tx.auctionItem.findUnique({
                where: { uuid: lotUuid },
                select: { auctionId: true },
            });
            if (!ref) throw httpError("Lot not found", 404);

            // Lock the auction row so two lots can't be started at the same time
            await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${ref.auctionId} FOR UPDATE`;

            // Re-read after the lock so the status is current
            const lot = await tx.auctionItem.findUnique({
                where: { uuid: lotUuid },
                select: {
                    id: true,
                    auctionId: true,
                    itemNumber: true,
                    status: true,
                    currentBid: true,
                    currentBidderId: true,
                    reservePrice: true,
                    bidCount: true,
                    auction: { select: { status: true, deletedAt: true } },
                },
            });
            if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);

            let status;
            let final = null;

            if (action === "start") {
                if (lot.auction.status !== "LIVE") {
                    throw httpError(`The auction must be Live to start a lot (it's ${lot.auction.status})`, 409);
                }
                if (!STARTABLE_LOT_STATUSES.includes(lot.status)) {
                    throw httpError(`Lot #${lot.itemNumber} is ${lot.status} and can't be started`, 409);
                }
                const live = await tx.auctionItem.findFirst({
                    where: { auctionId: lot.auctionId, status: "ACTIVE", id: { not: lot.id } },
                    select: { itemNumber: true },
                });
                if (live) {
                    throw httpError(`Lot #${live.itemNumber} is already live. Stop it before starting another lot.`, 409);
                }
                status = "ACTIVE";
            } else {
                if (lot.status !== "ACTIVE") throw httpError(`Lot #${lot.itemNumber} isn't live`, 409);
                // bids are settled in Redis — stop them and close on the final position
                final = await freezeLotBidding(lotUuid);
                if (final) onFrozen();
                status = closedLotStatus({ ...lot, ...final });
            }

            const updated = await tx.auctionItem.update({
                where: { id: lot.id },
                data: { status, ...final },
                select: { uuid: true, itemNumber: true, title: true, status: true, currentBid: true, bidCount: true },
            });

            if (status === "SOLD") {
                const closed = { ...lot, ...final };
                await recordWinner(tx, {
                    auctionId: lot.auctionId,
                    itemId: lot.id,
                    winnerId: closed.currentBidderId,
                    hammerPrice: closed.currentBid,
                });
            }

            return serializeBigInt(updated);
        },
        { maxWait: 10_000, timeout: 20_000 }
    );

// =====================================================================
// HAMMER (auctioneer console)
// Sells the live lot to the leading bidder at the current bid, whether or
// not the reserve is met (the auctioneer's call — the console warns). The
// console sends the bid count it showed, so a bid that lands while the
// auctioneer confirms stops the hammer instead of selling to someone else.
// =====================================================================

export const hammerLotService = ({ lotUuid, bidCount }) =>
    closingLot(lotUuid, (onFrozen) => hammerLotTx({ lotUuid, expectedBidCount: bidCount, onFrozen }));

const hammerLotTx = ({ lotUuid, expectedBidCount, onFrozen }) =>
    prisma.$transaction(
        async (tx) => {
            const ref = await tx.auctionItem.findUnique({
                where: { uuid: lotUuid },
                select: { auctionId: true },
            });
            if (!ref) throw httpError("Lot not found", 404);

            // Same lock as start / stop, so the lot can't be stopped while it's hammered
            await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${ref.auctionId} FOR UPDATE`;

            const lot = await tx.auctionItem.findUnique({
                where: { uuid: lotUuid },
                select: {
                    id: true,
                    auctionId: true,
                    itemNumber: true,
                    title: true,
                    status: true,
                    currentBid: true,
                    currentBidderId: true,
                    bidCount: true,
                    currency: { select: { code: true, symbol: true } },
                    auction: { select: { deletedAt: true, currency: { select: { code: true, symbol: true } } } },
                },
            });
            if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);
            if (lot.status !== "ACTIVE") throw httpError(`Lot #${lot.itemNumber} isn't live`, 409);

            // bids are settled in Redis — stop them and sell on the final position
            const frozen = await freezeLotBidding(lotUuid);
            if (frozen) onFrozen();
            const final = frozen ?? {
                bidCount: lot.bidCount,
                currentBid: lot.currentBid === null ? null : lot.currentBid.toString(),
                currentBidderId: lot.currentBidderId,
            };

            if (Number(final.bidCount) === 0 || final.currentBid === null || !final.currentBidderId) {
                throw httpError(`Lot #${lot.itemNumber} has no bids to hammer. Stop the lot to close it unsold.`, 409);
            }
            if (expectedBidCount !== undefined && Number(final.bidCount) !== expectedBidCount) {
                throw httpError(`A new bid came in on Lot #${lot.itemNumber} — check the winning bid and hammer again`, 409);
            }

            const updated = await tx.auctionItem.update({
                where: { id: lot.id },
                data: { status: "SOLD", ...final },
                select: { uuid: true, itemNumber: true, title: true, status: true, currentBid: true, bidCount: true },
            });

            const winner = await recordWinner(tx, {
                auctionId: lot.auctionId,
                itemId: lot.id,
                winnerId: final.currentBidderId,
                hammerPrice: final.currentBid,
            });

            const [participant, user] = await Promise.all([
                tx.auctionParticipant.findUnique({
                    where: { auctionId_userId: { auctionId: lot.auctionId, userId: final.currentBidderId } },
                    select: { paddleNumber: true },
                }),
                tx.user.findUnique({
                    where: { id: final.currentBidderId },
                    select: { uuid: true, username: true, profile: { select: { displayName: true, firstName: true, lastName: true } } },
                }),
            ]);

            return serializeBigInt({
                lot: updated,
                currency: lot.currency ?? lot.auction.currency,
                hammerPrice: winner.finalHammerPrice,
                buyerPremium: winner.buyerPremiumAmount,
                totalAmountDue: winner.totalAmountDue,
                winner: { uuid: user?.uuid ?? null, paddle: participant?.paddleNumber ?? null, name: displayName(user) },
            });
        },
        { maxWait: 10_000, timeout: 20_000 }
    );
