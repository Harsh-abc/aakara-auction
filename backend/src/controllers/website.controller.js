import { ZodError } from "zod";

import {
    createHomeBannerService,
    deleteHomeBannerService,
    getActiveHomeBannersService,
    getHomeBannersService,
    removeHomeBannerImageService,
    reorderHomeBannersService,
    setHomeBannerImageService,
    updateHomeBannerService,
} from "../services/website.services.js";
import {
    bannerImageParamsSchema,
    bannerImageSizeSchema,
    bannerUuidParamSchema,
    createHomeBannerSchema,
    reorderHomeBannersSchema,
    updateHomeBannerSchema,
} from "../validations/website.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: error.issues?.[0]?.message || "Validation failed",
        });
    }
    console.error(`${label} error:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/website/home-banners — storefront, no login (active banners only)
// -----------------------------------------------------------------

export const getActiveHomeBanners = async (req, res) => {
    try {
        const data = await getActiveHomeBannersService();
        return res.status(200).json({ success: true, message: "Home banners fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get home banners", "Failed to fetch the home banners");
    }
};

// -----------------------------------------------------------------
// GET /api/website/home-banners/all — every banner, hidden ones too
// -----------------------------------------------------------------

export const getHomeBanners = async (req, res) => {
    try {
        const data = await getHomeBannersService();
        return res.status(200).json({ success: true, message: "Home banners fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get all home banners", "Failed to fetch the home banners");
    }
};

// -----------------------------------------------------------------
// POST /api/website/home-banners — multipart: image (laptop), tabletImage?, mobileImage?,
// their sizes (imageWidth / imageHeight, tabletImageWidth …), altText?, linkUrl?, isActive?
// -----------------------------------------------------------------

export const createHomeBanner = async (req, res) => {
    try {
        const body = createHomeBannerSchema.parse(req.body ?? {});
        const data = await createHomeBannerService({ files: req.files, ...body });
        return res.status(201).json({ success: true, message: "Banner added", data });
    } catch (error) {
        return handleError(res, error, "Create home banner", "Failed to upload the banner");
    }
};

// -----------------------------------------------------------------
// PUT /api/website/home-banners/:uuid/images/:device — multipart: image, width?, height?
// device = desktop | tablet | mobile
// -----------------------------------------------------------------

export const setHomeBannerImage = async (req, res) => {
    try {
        const params = bannerImageParamsSchema.parse(req.params);
        const size = bannerImageSizeSchema.parse(req.body ?? {});
        const data = await setHomeBannerImageService({ ...params, ...size, file: req.file });
        return res.status(200).json({ success: true, message: "Banner image saved", data });
    } catch (error) {
        return handleError(res, error, "Set home banner image", "Failed to upload the image");
    }
};

// -----------------------------------------------------------------
// DELETE /api/website/home-banners/:uuid/images/:device — tablet | mobile (falls back to laptop)
// -----------------------------------------------------------------

export const removeHomeBannerImage = async (req, res) => {
    try {
        const params = bannerImageParamsSchema.parse(req.params);
        const data = await removeHomeBannerImageService(params);
        return res.status(200).json({ success: true, message: "Banner image removed", data });
    } catch (error) {
        return handleError(res, error, "Remove home banner image", "Failed to remove the image");
    }
};

// -----------------------------------------------------------------
// PATCH /api/website/home-banners/reorder — { uuids: [...every banner, in order] }
// -----------------------------------------------------------------

export const reorderHomeBanners = async (req, res) => {
    try {
        const { uuids } = reorderHomeBannersSchema.parse(req.body ?? {});
        const data = await reorderHomeBannersService({ uuids });
        return res.status(200).json({ success: true, message: "Banner order saved", data });
    } catch (error) {
        return handleError(res, error, "Reorder home banners", "Failed to save the banner order");
    }
};

// -----------------------------------------------------------------
// PATCH /api/website/home-banners/:uuid — { altText?, linkUrl?, isActive? }
// -----------------------------------------------------------------

export const updateHomeBanner = async (req, res) => {
    try {
        const { uuid } = bannerUuidParamSchema.parse(req.params);
        const body = updateHomeBannerSchema.parse(req.body ?? {});
        const data = await updateHomeBannerService({ uuid, ...body });
        return res.status(200).json({ success: true, message: "Banner updated", data });
    } catch (error) {
        return handleError(res, error, "Update home banner", "Failed to update the banner");
    }
};

// -----------------------------------------------------------------
// DELETE /api/website/home-banners/:uuid — removes the row and its S3 file
// -----------------------------------------------------------------

export const deleteHomeBanner = async (req, res) => {
    try {
        const { uuid } = bannerUuidParamSchema.parse(req.params);
        const data = await deleteHomeBannerService({ uuid });
        return res.status(200).json({ success: true, message: "Banner deleted", data });
    } catch (error) {
        return handleError(res, error, "Delete home banner", "Failed to delete the banner");
    }
};
