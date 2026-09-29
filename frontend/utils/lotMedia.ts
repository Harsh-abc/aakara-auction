import type { LotDocumentFile, LotImageFile } from "@/lib/types/AuctionsFormData";
import type { MediaType } from "@/lib/types/auction.types";

// ============================================================
// Lot media/documents can be a NEW upload (File) or a SAVED
// file from the API (URL, edit only). These helpers hide that.
// ============================================================

const nameFromUrl = (url: string): string => {
    try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
    } catch {
        return url.split("/").pop() || url;
    }
};

export const getMediaType = (media: LotImageFile | undefined): MediaType | null => {
    if (!media) return null;
    if (media.file) {
        if (media.file.type.startsWith("image/")) return "IMAGE";
        if (media.file.type.startsWith("video/")) return "VIDEO";
        return null;
    }
    return media.url ? media.mediaType ?? "IMAGE" : null;
};

export const isImageMedia = (media: LotImageFile | undefined) => getMediaType(media) === "IMAGE";
export const isVideoMedia = (media: LotImageFile | undefined) => getMediaType(media) === "VIDEO";

export const getMediaName = (media: LotImageFile): string =>
    media.file?.name ?? (media.url ? nameFromUrl(media.url) : "media");

/** Only object URLs we created need revoking — saved URLs are remote. */
export const revokeMediaPreview = (media: LotImageFile | undefined) => {
    if (media?.preview?.startsWith("blob:")) URL.revokeObjectURL(media.preview);
};

export const getDocumentName = (doc: LotDocumentFile): string =>
    doc.file?.name ?? doc.fileName ?? (doc.fileUrl ? nameFromUrl(doc.fileUrl) : "document");

export const getDocumentSize = (doc: LotDocumentFile): number | null =>
    doc.file?.size ?? doc.fileSize ?? null;
