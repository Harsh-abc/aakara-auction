import prisma from "../libs/prisma.js";
import { deleteFromS3, uploadToS3 } from "./s3.services.js";

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Storefront hero images — managed in Settings → Website, shown on the home page
 * when no sale is featured (or the featured sale has no cover image).
 * Each banner has a laptop image and optional tablet / mobile versions.
 */
export const MAX_HOME_BANNERS = 10;

const ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }];

// the columns behind each device's image
const DEVICE_COLUMNS = {
    desktop: { url: "imageUrl", key: "imageKey", width: "imageWidth", height: "imageHeight", field: "image" },
    tablet: { url: "tabletImageUrl", key: "tabletImageKey", width: "tabletImageWidth", height: "tabletImageHeight", field: "tabletImage" },
    mobile: { url: "mobileImageUrl", key: "mobileImageKey", width: "mobileImageWidth", height: "mobileImageHeight", field: "mobileImage" },
};
const DEVICE_LABELS = { desktop: "laptop", tablet: "tablet", mobile: "mobile" };

const IMAGE_SELECT = Object.fromEntries(
    Object.values(DEVICE_COLUMNS).flatMap(({ url, width, height }) => [
        [url, true],
        [width, true],
        [height, true],
    ])
);

const PUBLIC_SELECT = { uuid: true, ...IMAGE_SELECT, altText: true, linkUrl: true };
const ADMIN_SELECT = { ...PUBLIC_SELECT, sortOrder: true, isActive: true, createdAt: true, updatedAt: true };

// files are already gone from the row — a leftover in the bucket isn't worth failing over
const removeFiles = async (keys) => {
    await Promise.all(
        keys.filter(Boolean).map((key) =>
            deleteFromS3(key).catch((err) => console.error("[website] could not delete banner image from S3:", err.message))
        )
    );
};

const uploadBannerFile = (file, device) => uploadToS3({ file, folder: `website/home-banners/${device}` });

// =====================================================================
// STOREFRONT — active banners in display order
// =====================================================================

export const getActiveHomeBannersService = () =>
    prisma.homeBanner.findMany({ where: { isActive: true }, orderBy: ORDER, select: PUBLIC_SELECT });

// =====================================================================
// DASHBOARD
// =====================================================================

export const getHomeBannersService = () => prisma.homeBanner.findMany({ orderBy: ORDER, select: ADMIN_SELECT });

// `files` is multer's fields map: { image: [file], tabletImage?: [file], mobileImage?: [file] }
export const createHomeBannerService = async ({ files = {}, altText, linkUrl, isActive, ...sizes }) => {
    if (!files.image?.[0]) throw httpError("Choose a laptop image to upload");

    const total = await prisma.homeBanner.count();
    if (total >= MAX_HOME_BANNERS) {
        throw httpError(`You can keep up to ${MAX_HOME_BANNERS} banners — delete one first`);
    }

    const devices = Object.entries(DEVICE_COLUMNS).filter(([, columns]) => files[columns.field]?.[0]);
    const results = await Promise.allSettled(devices.map(([device, columns]) => uploadBannerFile(files[columns.field][0], device)));

    // all or nothing — don't leave half a banner's files in the bucket
    const failed = results.find((r) => r.status === "rejected");
    if (failed) {
        await removeFiles(results.filter((r) => r.status === "fulfilled").map((r) => r.value.key));
        throw failed.reason;
    }

    const imageData = {};
    devices.forEach(([, columns], index) => {
        imageData[columns.url] = results[index].value.url;
        imageData[columns.key] = results[index].value.key;
        imageData[columns.width] = sizes[columns.width] ?? null;
        imageData[columns.height] = sizes[columns.height] ?? null;
    });

    // new banners go to the end of the rotation
    const last = await prisma.homeBanner.aggregate({ _max: { sortOrder: true } });

    return prisma.homeBanner.create({
        data: {
            ...imageData,
            altText: altText ?? null,
            linkUrl: linkUrl ?? null,
            isActive,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
        select: ADMIN_SELECT,
    });
};

export const updateHomeBannerService = async ({ uuid, ...changes }) => {
    const banner = await prisma.homeBanner.findUnique({ where: { uuid }, select: { id: true } });
    if (!banner) throw httpError("Banner not found", 404);

    const data = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
    return prisma.homeBanner.update({ where: { uuid }, data, select: ADMIN_SELECT });
};

// add or replace one device's image; the old file is removed once the row points at the new one
export const setHomeBannerImageService = async ({ uuid, device, file, width, height }) => {
    if (!file) throw httpError(`Choose a ${DEVICE_LABELS[device]} image to upload`);

    const columns = DEVICE_COLUMNS[device];
    const banner = await prisma.homeBanner.findUnique({ where: { uuid }, select: { [columns.key]: true } });
    if (!banner) throw httpError("Banner not found", 404);

    const { url, key } = await uploadBannerFile(file, device);

    let updated;
    try {
        updated = await prisma.homeBanner.update({
            where: { uuid },
            data: { [columns.url]: url, [columns.key]: key, [columns.width]: width ?? null, [columns.height]: height ?? null },
            select: ADMIN_SELECT,
        });
    } catch (error) {
        await removeFiles([key]);
        throw error;
    }

    await removeFiles([banner[columns.key]]);
    return updated;
};

// tablet / mobile only — the laptop image is the banner itself (replace it, or delete the banner)
export const removeHomeBannerImageService = async ({ uuid, device }) => {
    if (device === "desktop") throw httpError("The laptop image can be replaced but not removed — delete the banner instead");

    const columns = DEVICE_COLUMNS[device];
    const banner = await prisma.homeBanner.findUnique({ where: { uuid }, select: { [columns.key]: true } });
    if (!banner) throw httpError("Banner not found", 404);

    const updated = await prisma.homeBanner.update({
        where: { uuid },
        data: { [columns.url]: null, [columns.key]: null, [columns.width]: null, [columns.height]: null },
        select: ADMIN_SELECT,
    });

    await removeFiles([banner[columns.key]]);
    return updated;
};

// `uuids` is every banner, in the new order
export const reorderHomeBannersService = async ({ uuids }) => {
    const existing = await prisma.homeBanner.findMany({ select: { uuid: true } });
    const known = new Set(existing.map((b) => b.uuid));

    if (new Set(uuids).size !== uuids.length || uuids.length !== known.size || !uuids.every((uuid) => known.has(uuid))) {
        throw httpError("The banner list changed — refresh the page and try again", 409);
    }

    await prisma.$transaction(
        uuids.map((uuid, index) => prisma.homeBanner.update({ where: { uuid }, data: { sortOrder: index } }))
    );

    return getHomeBannersService();
};

export const deleteHomeBannerService = async ({ uuid }) => {
    const banner = await prisma.homeBanner.findUnique({
        where: { uuid },
        select: { imageKey: true, tabletImageKey: true, mobileImageKey: true },
    });
    if (!banner) throw httpError("Banner not found", 404);

    await prisma.homeBanner.delete({ where: { uuid } });
    await removeFiles([banner.imageKey, banner.tabletImageKey, banner.mobileImageKey]);

    return { uuid };
};
