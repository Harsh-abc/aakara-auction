import {
    createAuctionService,
} from "../services/auction.services.js";
import { serializeBigInt } from "../utils/serialize.js";

export const createAuction = async (req, res) => {
    try {
        console.log("========== AUCTION CONTROLLER ==========");
        console.log("REQ.USER:", req.user);
        console.log("BODY:", req.body);
        console.log("========================================");

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found",
            });
        }

        const body = {
            ...req.body,
        }

        body.tags = body.tags ? JSON.parse(body.tags) : [];
        body.fees = body.fees ? JSON.parse(body.fees) : [];
        body.lots = body.lots ? JSON.parse(body.lots) : [];

        const files = req.files || [];

        const coverImage = files.find(
            (file) => file.fieldname === "coverImage"
        );

        if (coverImage) {
            const uploadedCover = await uploadToS3({
                file: coverImage,
                folder: "auctions/covers",
            });

            body.coverImageUrl = uploadedCover.url;
        }

        for (let i = 0; i < body.lots.length; i++) {

            body.lots[i].images = [];
            body.lots[i].documents = [];



            const lotImages = files.filter(
                (file) =>
                    file.fieldname === `lotImages_${i}`
            );

            for (let j = 0; j < lotImages.length; j++) {

                const file = lotImages[j];

                const uploadedImage = await uploadToS3({
                    file,
                    folder: `auctions/lots/${i + 1}/images`,
                });

                body.lots[i].images.push({
                    url: uploadedImage.url,
                    thumbnailUrl: null,
                    caption: null,
                    sortOrder: j,
                    isPrimary: j === 0,
                    mediaType: "IMAGE",
                });
            }


            const lotVideos = files.filter(
                (file) =>
                    file.fieldname === `lotVideos_${i}`
            );

            for (let j = 0; j < lotVideos.length; j++) {

                const file = lotVideos[j];

                const uploadedVideo = await uploadToS3({
                    file,
                    folder: `auctions/lots/${i + 1}/videos`,
                });

                body.lots[i].images.push({
                    url: uploadedVideo.url,
                    thumbnailUrl: null,
                    caption: null,
                    sortOrder: lotImages.length + j,
                    isPrimary: false,
                    mediaType: "VIDEO",
                });
            }


            const lotDocuments = files.filter(
                (file) =>
                    file.fieldname === `lotDocuments_${i}`
            );

            for (let j = 0; j < lotDocuments.length; j++) {

                const file = lotDocuments[j];

                const uploadedDocument = await uploadToS3({
                    file,
                    folder: `auctions/lots/${i + 1}/documents`,
                });

                body.lots[i].documents.push({
                    documentType: "OTHER",
                    fileUrl: uploadedDocument.url,
                    fileName: uploadedDocument.fileName,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    description: null,
                });
            }
        }


        body.createdBy = Number(req.user.userId);

        const auction = await createAuctionService(body);

        return res.status(201).json({
            success: true,
            message: "Auction created successfully",
            data: serializeBigInt(auction),
        });
    } catch (error) {
        console.error("Create auction error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create auction",
        });
    }
};