import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { overlayLiveBids } from "./bidding.services.js";
import { PUBLIC_LOT_SELECT, publicSaleWhere, toPublicLot } from "./publicAuction.services.js";

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * "My auction gallery" — lots a signed-in user saved from the storefront.
 * Only lots in sales the storefront shows can be saved or listed; a sale that is later
 * unpublished or withdrawn simply drops out of the list.
 */

export const getMyGalleryService = async ({ userId }) => {
    const saved = await prisma.userGalleryItem.findMany({
        where: { userId, item: { auction: publicSaleWhere() } },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            item: {
                select: {
                    ...PUBLIC_LOT_SELECT,
                    auction: {
                        select: {
                            uuid: true,
                            title: true,
                            status: true,
                            startTime: true,
                            endTime: true,
                            timezone: true,
                            currency: { select: { code: true, symbol: true } },
                        },
                    },
                },
            },
        },
    });

    const lots = await overlayLiveBids(saved.map((row) => row.item));

    return serializeBigInt(
        lots.map(({ auction: { currency, ...auction }, ...lot }, index) => ({
            savedAt: saved[index].createdAt,
            auction,
            lot: toPublicLot(lot, currency),
        }))
    );
};

const findPublicLot = async (lotUuid) => {
    const lot = await prisma.auctionItem.findFirst({
        where: { uuid: lotUuid, auction: publicSaleWhere() },
        select: { id: true },
    });
    if (!lot) throw httpError("Lot not found", 404);
    return lot;
};

// saving a lot that's already saved is a no-op
export const addToGalleryService = async ({ userId, lotUuid }) => {
    const lot = await findPublicLot(lotUuid);
    await prisma.userGalleryItem.upsert({
        where: { userId_itemId: { userId, itemId: lot.id } },
        create: { userId, itemId: lot.id },
        update: {},
    });
    return { lotUuid, saved: true };
};

export const removeFromGalleryService = async ({ userId, lotUuid }) => {
    await prisma.userGalleryItem.deleteMany({ where: { userId, item: { uuid: lotUuid } } });
    return { lotUuid, saved: false };
};
