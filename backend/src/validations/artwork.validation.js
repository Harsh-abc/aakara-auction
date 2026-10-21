import { z } from "zod";

// dashboard: Artworks — every lot across every auction (the house's catalogue)
const optionalText = (max) => z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(max).optional());
const optionalUuid = (label) => z.preprocess((v) => (v === "" ? undefined : v), z.uuid({ message: `Invalid ${label} id` }).optional());

export const ARTWORK_STAGES = ["all", "upcoming", "live", "sold", "unsold", "withdrawn"];
export const ARTWORK_SORTS = ["newest", "title", "artist", "estimate", "price"];

export const getArtworksQuerySchema = z.object({
    search: optionalText(200),
    auctionUuid: optionalUuid("auction"),
    categoryUuid: optionalUuid("category"),
    stage: z.preprocess((v) => (v === "" ? undefined : v), z.enum(ARTWORK_STAGES).default("all")),
    sort: z.preprocess((v) => (v === "" ? undefined : v), z.enum(ARTWORK_SORTS).default("newest")),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(24),
});
