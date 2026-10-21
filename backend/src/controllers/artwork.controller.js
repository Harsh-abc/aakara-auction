import { ZodError } from "zod";

import { getArtworkService, getArtworksService, getArtworkSummaryService } from "../services/artwork.services.js";
import { lotUuidParamSchema } from "../validations/auction.validation.js";
import { getArtworksQuerySchema } from "../validations/artwork.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: error.issues?.[0]?.message || "Validation failed",
        });
    }
    const status = error.statusCode || 500;
    if (status === 500) console.error(`${label} error:`, error);
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/auction/artworks?page&limit&search&auctionUuid&categoryUuid&stage&sort
// Every lot of every auction — the house's catalogue
// -----------------------------------------------------------------

export const getArtworks = async (req, res) => {
    try {
        const query = getArtworksQuerySchema.parse(req.query);
        const data = await getArtworksService(query);
        return res.status(200).json({ success: true, message: "Artworks fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get artworks", "Failed to fetch the artworks");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/artworks/summary — totals, and the auctions / categories to filter by
// -----------------------------------------------------------------

export const getArtworkSummary = async (req, res) => {
    try {
        const data = await getArtworkSummaryService();
        return res.status(200).json({ success: true, message: "Artwork summary fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get artwork summary", "Failed to fetch the artwork summary");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/artworks/:lotUuid
// One artwork: every image, catalogue + condition notes, documents, interest and its sale
// -----------------------------------------------------------------

export const getArtwork = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const data = await getArtworkService({ lotUuid });
        return res.status(200).json({ success: true, message: "Artwork fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get artwork", "Failed to fetch the artwork");
    }
};
