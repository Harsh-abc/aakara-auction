import { z } from "zod";

// "" / null clears the field; multipart bodies send everything as strings
const clearable = (schema) => z.preprocess((v) => (v === "" || v === "null" ? null : v), schema.nullable().optional());

// a site path ("/auctions/…", "/#auctions") or an http(s) URL
const linkUrl = z
    .string()
    .trim()
    .max(500, "Link must be 500 characters or fewer")
    .refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\/[^\s]+$/i.test(v), {
        message: "Link must start with / (a page on this site) or http(s)://",
    });

const altText = z.string().trim().max(200, "Alt text must be 200 characters or fewer");

// pixel size of an uploaded image, measured by the browser (sets the hero's shape)
const dimension = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().int().min(1).max(20000).optional()
);

export const BANNER_DEVICES = ["desktop", "tablet", "mobile"];

export const bannerUuidParamSchema = z.object({
    uuid: z.uuid({ message: "Invalid banner id" }),
});

export const bannerImageParamsSchema = z.object({
    uuid: z.uuid({ message: "Invalid banner id" }),
    device: z.enum(BANNER_DEVICES, { message: "Device must be desktop, tablet or mobile" }),
});

export const bannerImageSizeSchema = z.object({
    width: dimension,
    height: dimension,
});

export const createHomeBannerSchema = z.object({
    altText: clearable(altText),
    linkUrl: clearable(linkUrl),
    isActive: z.preprocess((v) => (v === undefined ? undefined : v === true || v === "true"), z.boolean().default(true)),
    imageWidth: dimension,
    imageHeight: dimension,
    tabletImageWidth: dimension,
    tabletImageHeight: dimension,
    mobileImageWidth: dimension,
    mobileImageHeight: dimension,
});

export const updateHomeBannerSchema = z
    .object({
        altText: clearable(altText),
        linkUrl: clearable(linkUrl),
        isActive: z.boolean().optional(),
    })
    .refine((body) => Object.values(body).some((v) => v !== undefined), { message: "Nothing to update" });

export const reorderHomeBannersSchema = z.object({
    uuids: z.array(z.uuid({ message: "Invalid banner id" })).min(1, "Send the banners in their new order"),
});
