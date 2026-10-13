import { ZodError } from 'zod';

import { addToGalleryService, getMyGalleryService, removeFromGalleryService } from '../services/gallery.services.js';
import { galleryLotSchema } from '../validations/user.validation.js';

const handleError = (res, err) => {
    if (err instanceof ZodError) {
        return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues });
    }
    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
    });
};

export const getMyGallery = async (req, res) => {
    try {
        const items = await getMyGalleryService({ userId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: 'Gallery fetched successfully',
            data: items,
        });
    } catch (err) {
        return handleError(res, err);
    }
};

export const addToGallery = async (req, res) => {
    try {
        const { lotUuid } = galleryLotSchema.parse(req.params);
        const result = await addToGalleryService({ userId: BigInt(req.user.userId), lotUuid });

        return res.status(200).json({
            success: true,
            message: 'Added to your auction gallery',
            data: result,
        });
    } catch (err) {
        return handleError(res, err);
    }
};

export const removeFromGallery = async (req, res) => {
    try {
        const { lotUuid } = galleryLotSchema.parse(req.params);
        const result = await removeFromGalleryService({ userId: BigInt(req.user.userId), lotUuid });

        return res.status(200).json({
            success: true,
            message: 'Removed from your auction gallery',
            data: result,
        });
    } catch (err) {
        return handleError(res, err);
    }
};
