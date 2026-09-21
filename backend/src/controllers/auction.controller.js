
import {
    createAuctionService,
    getAuctionService,
    getLotByAuctionId
} from "../services/auction.services.js";

import {
    uploadToS3,
} from "../services/s3.services.js";

import {
    serializeBigInt,
} from "../utils/serialize.js";


// -----------------------------------
// Helper: Parse JSON form-data fields
// -----------------------------------

const parseJsonField = (value, defaultValue = []) => {
    // Field is not provided
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    // Already an array or object
    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        throw new Error(
            "Invalid JSON format in form-data field"
        );
    }
};


// -----------------------------------
// Create Auction Controller
// -----------------------------------

export const createAuction = async (req, res) => {
    try {
        console.log(
            "========== AUCTION CONTROLLER =========="
        );

        console.log("REQ.USER:", req.user);

        console.log("BODY:", req.body);

        console.log("========================================");


        // -----------------------------------
        // Authentication validation
        // -----------------------------------

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found",
            });
        }


        // -----------------------------------
        // Prepare request body
        // -----------------------------------

        const body = {
            ...req.body,
        };


        // -----------------------------------
        // Parse multipart form-data fields
        // -----------------------------------

        body.tags = parseJsonField(
            body.tags,
            []
        );

        body.fees = parseJsonField(
            body.fees,
            []
        );

        body.lots = parseJsonField(
            body.lots,
            []
        );


        // -----------------------------------
        // Validate parsed fields
        // -----------------------------------

        if (!Array.isArray(body.tags)) {
            return res.status(400).json({
                success: false,
                message: "Tags must be an array",
            });
        }

        if (!Array.isArray(body.fees)) {
            return res.status(400).json({
                success: false,
                message: "Fees must be an array",
            });
        }

        if (!Array.isArray(body.lots)) {
            return res.status(400).json({
                success: false,
                message: "Lots must be an array",
            });
        }


        // -----------------------------------
        // Get uploaded files
        // -----------------------------------

        const files = Array.isArray(req.files)
            ? req.files
            : [];


        // -----------------------------------
        // Upload auction cover image
        // -----------------------------------

        const coverImage = files.find(
            (file) =>
                file.fieldname === "coverImage"
        );


        if (coverImage) {
            const uploadedCover = await uploadToS3({
                file: coverImage,
                folder: "auctions/covers",
            });

            body.coverImageUrl = uploadedCover.url;
        }


        // -----------------------------------
        // Process lots and lot files
        // -----------------------------------

        for (
            let i = 0;
            i < body.lots.length;
            i++
        ) {
            const lot = body.lots[i];


            // Initialize arrays
            lot.images = [];
            lot.documents = [];


            // -----------------------------------
            // Upload lot images
            // -----------------------------------

            const lotImages = files.filter(
                (file) =>
                    file.fieldname === `lotImages_${i}`
            );


            for (
                let j = 0;
                j < lotImages.length;
                j++
            ) {
                const file = lotImages[j];

                const uploadedImage = await uploadToS3({
                    file,
                    folder: `auctions/lots/${i + 1}/images`,
                });


                lot.images.push({
                    url: uploadedImage.url,

                    thumbnailUrl: null,

                    caption: null,

                    sortOrder: j,

                    isPrimary: j === 0,

                    mediaType: "IMAGE",
                });
            }


            // -----------------------------------
            // Upload lot videos
            // -----------------------------------

            const lotVideos = files.filter(
                (file) =>
                    file.fieldname === `lotVideos_${i}`
            );


            for (
                let j = 0;
                j < lotVideos.length;
                j++
            ) {
                const file = lotVideos[j];

                const uploadedVideo = await uploadToS3({
                    file,
                    folder: `auctions/lots/${i + 1}/videos`,
                });


                lot.images.push({
                    url: uploadedVideo.url,

                    thumbnailUrl: null,

                    caption: null,

                    sortOrder:
                        lotImages.length + j,

                    isPrimary: false,

                    mediaType: "VIDEO",
                });
            }


            // -----------------------------------
            // Upload lot documents
            // -----------------------------------

            const lotDocuments = files.filter(
                (file) =>
                    file.fieldname === `lotDocuments_${i}`
            );


            for (
                let j = 0;
                j < lotDocuments.length;
                j++
            ) {
                const file = lotDocuments[j];

                const uploadedDocument = await uploadToS3({
                    file,
                    folder: `auctions/lots/${i + 1}/documents`,
                });


                lot.documents.push({
                    documentType: "OTHER",

                    fileUrl: uploadedDocument.url,

                    fileName: uploadedDocument.fileName,

                    mimeType: file.mimetype,

                    fileSize: file.size,

                    description: null,
                });
            }
        }


        // -----------------------------------
        // Set authenticated user
        // -----------------------------------

        body.createdBy = Number(
            req.user.userId
        );


        // -----------------------------------
        // Create auction
        // -----------------------------------

        const auction = await createAuctionService(
            body
        );


        // -----------------------------------
        // Send success response
        // -----------------------------------

        return res.status(201).json({
            success: true,

            message: "Auction created successfully",

            data: serializeBigInt(auction),
        });

    } catch (error) {
        console.error(
            "Create auction error:",
            error
        );


        return res.status(400).json({
            success: false,

            message:
                error.message ||
                "Failed to create auction",
        });
    }
};








export const getAuction = async (req, res) => {
    try {
        const {
            search,
            status,
            auctionType,
        } = req.query;

        const result = await getAuctionService({
            search,
            status,
            auctionType,
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("Get auction error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch auctions",
        });
    }
};


export const getLotByAuctionIdController = async (req, res) => {
    try {
        const { auctionUuid } = req.params;

        const result = await getLotByAuctionId({
            auctionUuid,
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get lots by auction ID error:", error);

        if (error.message === "Auction UUID is required") {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        if (error.message === "Auction not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch lots",
        });
    }
};