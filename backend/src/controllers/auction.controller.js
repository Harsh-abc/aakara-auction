import {
    createAuctionService,
    deleteAuctionService,
    getAuctionService,
    getLotByAuctionId,
} from "../services/auction.services.js";

import { uploadToS3, deleteFromS3 } from "../services/s3.services.js";
import { serializeBigInt } from "../utils/serialize.js";

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

const parseJsonField = (value, defaultValue, fieldName) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        const error = new Error(`Invalid JSON in form-data field "${fieldName}"`);
        error.statusCode = 400;
        throw error;
    }
};

const statusFromError = (error) => {
    if (error.statusCode) return error.statusCode;
    // Prisma known errors
    if (error.code === "P2002") return 409; // unique constraint
    if (error.code === "P2025") return 404; // record not found
    if (error.code === "P2003") return 400; // FK violation
    return 500;
};

const messageFromError = (error, status) => {
    if (error.code === "P2002") {
        const target = error.meta?.target;
        return `Duplicate value for ${Array.isArray(target) ? target.join(", ") : target || "a unique field"}`;
    }
    if (status === 500) return "Failed to create auction";
    return error.message || "Failed to create auction";
};

// -----------------------------------------------------------------
// Create Auction
//
// Expected multipart fields:
//   coverImage                 (single file, optional)
//   lotMedia_{i}               images + videos for lot i, in display order
//   lotImages_{i} / lotVideos_{i}  (legacy, still accepted)
//   lotDocuments_{i}           documents for lot i, in order
//   lots                       JSON; each lot may carry:
//        mediaMeta:    [{ isPrimary, caption }]        aligned with lotMedia_{i}
//        documentMeta: [{ documentType, description }] aligned with lotDocuments_{i}
// -----------------------------------------------------------------

export const createAuction = async (req, res) => {
    const uploadedKeys = []; // for rollback if the DB write fails

    const upload = async (file, folder) => {
        const result = await uploadToS3({ file, folder });
        uploadedKeys.push(result.key);
        return result;
    };

    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found",
            });
        }

        const body = { ...req.body };

        body.tags = parseJsonField(body.tags, [], "tags");
        body.fees = parseJsonField(body.fees, [], "fees");
        body.lots = parseJsonField(body.lots, [], "lots");

        for (const key of ["tags", "fees", "lots"]) {
            if (!Array.isArray(body[key])) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be an array`,
                });
            }
        }

        // Cheap validation BEFORE uploading anything to S3
        if (!body.title?.trim()) {
            return res.status(400).json({ success: false, message: "Auction title is required" });
        }
        if (!body.categoryUuid) {
            return res.status(400).json({ success: false, message: "Category is required" });
        }
        if (!body.startTime || !body.endTime) {
            return res.status(400).json({
                success: false,
                message: "Auction start and end date/time are required",
            });
        }

        const files = Array.isArray(req.files) ? req.files : [];
        const filesFor = (fieldname) => files.filter((f) => f.fieldname === fieldname);

        // ------------------ cover image ------------------
        const coverImage = files.find((f) => f.fieldname === "coverImage");
        if (coverImage) {
            if (!coverImage.mimetype.startsWith("image/")) {
                return res.status(400).json({
                    success: false,
                    message: "Cover image must be an image file",
                });
            }
            const uploaded = await upload(coverImage, "auctions/covers");
            body.coverImageUrl = uploaded.url;
        } else {
            delete body.coverImageUrl; // never trust a client-supplied URL
        }

        // ------------------ lots ------------------
        const batchFolder = `auctions/${Date.now()}`;

        for (let i = 0; i < body.lots.length; i++) {
            const lot = body.lots[i];
            const mediaMeta = Array.isArray(lot.mediaMeta) ? lot.mediaMeta : [];
            const documentMeta = Array.isArray(lot.documentMeta) ? lot.documentMeta : [];

            // Never trust client-supplied URLs
            lot.images = [];
            lot.documents = [];

            // New field keeps the user's order; legacy fields appended after
            const mediaFiles = [
                ...filesFor(`lotMedia_${i}`),
                ...filesFor(`lotImages_${i}`),
                ...filesFor(`lotVideos_${i}`),
            ];

            const uploadedMedia = await Promise.all(
                mediaFiles.map((file) => {
                    const isVideo = file.mimetype.startsWith("video/");
                    return upload(file, `${batchFolder}/lot-${i + 1}/${isVideo ? "videos" : "images"}`);
                })
            );

            uploadedMedia.forEach((result, j) => {
                const file = mediaFiles[j];
                const meta = mediaMeta[j] || {};
                const isVideo = file.mimetype.startsWith("video/");
                lot.images.push({
                    url: result.url,
                    thumbnailUrl: null,
                    caption: meta.caption || null,
                    sortOrder: j,
                    isPrimary: !isVideo && Boolean(meta.isPrimary),
                    mediaType: isVideo ? "VIDEO" : "IMAGE",
                });
            });

            const docFiles = filesFor(`lotDocuments_${i}`);
            const uploadedDocs = await Promise.all(
                docFiles.map((file) => upload(file, `${batchFolder}/lot-${i + 1}/documents`))
            );

            uploadedDocs.forEach((result, j) => {
                const file = docFiles[j];
                const meta = documentMeta[j] || {};
                lot.documents.push({
                    documentType: meta.documentType || "OTHER",
                    fileUrl: result.url,
                    fileName: file.originalname,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    description: meta.description || null,
                });
            });

            delete lot.mediaMeta;
            delete lot.documentMeta;
        }

        body.createdBy = req.user.userId; // service converts to BigInt

        const auction = await createAuctionService(body);

        return res.status(201).json({
            success: true,
            message:
                auction.status === "DRAFT"
                    ? "Auction saved as draft"
                    : "Auction created successfully",
            data: serializeBigInt(auction),
        });
    } catch (error) {
        console.error("Create auction error:", error);

        // Roll back S3 uploads so failed requests don't leave orphaned files
        if (uploadedKeys.length > 0) {
            await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
        }

        const status = statusFromError(error);
        return res.status(status).json({
            success: false,
            message: messageFromError(error, status),
        });
    }
};

// -----------------------------------------------------------------
// Get Auctions
// -----------------------------------------------------------------

export const getAuction = async (req, res) => {
    try {
        const { search, status, auctionType, categoryUuid, visibility } = req.query;

        const result = await getAuctionService({
            search,
            status,
            auctionType,
            categoryUuid,
            visibility,
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get auction error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch auctions",
        });
    }
};

// -----------------------------------------------------------------
// Get Lots by Auction
// -----------------------------------------------------------------

export const getLotByAuctionIdController = async (req, res) => {
    try {
        const { auctionUuid } = req.params;
        const result = await getLotByAuctionId({ auctionUuid });
        return res.status(200).json(result);
    } catch (error) {
        console.error("Get lots by auction ID error:", error);
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Failed to fetch lots" : error.message,
        });
    }
};


// DELETE AUCTION WITH LOTS INSIDE THE AUCTION

export const deleteAuction = async (req, res) => {
    try {
        const { auctionUuid } = req.params;

        const result = await deleteAuctionService({
            auctionUuid,
            deletedBy: req.user?.userId,
        });

        return res.status(200).json({
            success: true,
            message: `"${result.title}" and its ${result.deletedLots} lot(s) were deleted`,
            data: {
                uuid: result.uuid,
                deletedLots: result.deletedLots,
            },
        });
    } catch (error) {
        console.error("Delete auction error:", error);
        const status = error.statusCode || (error.code === "P2025" ? 404 : 500);
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Failed to delete auction" : error.message,
        });
    }
};