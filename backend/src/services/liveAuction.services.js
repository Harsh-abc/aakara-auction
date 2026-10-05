import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";

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
// START / STOP A LOT
// Only one lot per auction can be live (ACTIVE) at a time.
// =====================================================================

export const setLotLiveService = async ({ lotUuid, action }) =>
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
                    reservePrice: true,
                    bidCount: true,
                    auction: { select: { status: true, deletedAt: true } },
                },
            });
            if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);

            let status;

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

                // Close the lot: sold if the top bid meets the reserve
                const hasBid = Number(lot.bidCount) > 0 && lot.currentBid !== null;
                const reserveMet =
                    hasBid && (lot.reservePrice === null || Number(lot.currentBid) >= Number(lot.reservePrice));
                status = reserveMet ? "SOLD" : hasBid ? "PASSED" : "UNSOLD";
            }

            const updated = await tx.auctionItem.update({
                where: { id: lot.id },
                data: { status },
                select: { uuid: true, itemNumber: true, title: true, status: true, currentBid: true, bidCount: true },
            });

            return serializeBigInt(updated);
        },
        { maxWait: 10_000, timeout: 20_000 }
    );
