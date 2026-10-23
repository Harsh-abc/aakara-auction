import { apiConnector } from "../apiConnector"
import { websiteEndPoints } from "../api"
import type { BannerDevice, HomeBanner, HomeBannerChanges, ImageSize, PublicHomeBanner } from "@/lib/types/website.types"

const { HOME_BANNERS_API, ALL_HOME_BANNERS_API, REORDER_HOME_BANNERS_API, HOME_BANNER_API, HOME_BANNER_IMAGE_API } = websiteEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// storefront — active banners only, in display order
export async function getHomeBanners(): Promise<PublicHomeBanner[]> {
    const response = await apiConnector({ method: "GET", url: HOME_BANNERS_API })
    return response.data.data
}

// dashboard — every banner, hidden ones too
export async function getAllHomeBanners(token: string | null): Promise<HomeBanner[]> {
    const response = await apiConnector({ method: "GET", url: ALL_HOME_BANNERS_API, header: authHeader(token) })
    return response.data.data
}

export interface NewBannerImage {
    file: File
    size?: ImageSize | null
}

// multipart field per device — sizes go in `${field}Width` / `${field}Height` (imageWidth, tabletImageWidth …)
const UPLOAD_FIELDS: Record<BannerDevice, string> = { desktop: "image", tablet: "tabletImage", mobile: "mobileImage" }

// a new banner: the laptop image (required) plus optional tablet / mobile versions, in one request
export async function uploadHomeBanner(
    token: string | null,
    {
        images,
        altText,
        linkUrl,
    }: { images: { desktop: NewBannerImage } & Partial<Record<BannerDevice, NewBannerImage>>; altText?: string; linkUrl?: string }
): Promise<HomeBanner> {
    const formData = new FormData()
    for (const [device, image] of Object.entries(images) as [BannerDevice, NewBannerImage | undefined][]) {
        if (!image) continue
        const field = UPLOAD_FIELDS[device]
        formData.append(field, image.file)
        if (image.size) {
            formData.append(`${field}Width`, String(image.size.width))
            formData.append(`${field}Height`, String(image.size.height))
        }
    }
    if (altText) formData.append("altText", altText)
    if (linkUrl) formData.append("linkUrl", linkUrl)
    const response = await apiConnector({ method: "POST", url: HOME_BANNERS_API, body: formData, header: authHeader(token) })
    return response.data.data
}

// add or replace the laptop / tablet / mobile image of a banner
export async function setHomeBannerImage(
    token: string | null,
    uuid: string,
    device: BannerDevice,
    image: File,
    size?: ImageSize | null
): Promise<HomeBanner> {
    const formData = new FormData()
    formData.append("image", image)
    if (size) {
        formData.append("width", String(size.width))
        formData.append("height", String(size.height))
    }
    const response = await apiConnector({
        method: "PUT",
        url: HOME_BANNER_IMAGE_API(uuid, device),
        body: formData,
        header: authHeader(token),
    })
    return response.data.data
}

// tablet / mobile only — the banner falls back to the laptop image
export async function removeHomeBannerImage(token: string | null, uuid: string, device: Exclude<BannerDevice, "desktop">): Promise<HomeBanner> {
    const response = await apiConnector({ method: "DELETE", url: HOME_BANNER_IMAGE_API(uuid, device), header: authHeader(token) })
    return response.data.data
}

export async function updateHomeBanner(token: string | null, uuid: string, changes: HomeBannerChanges): Promise<HomeBanner> {
    const response = await apiConnector({ method: "PATCH", url: HOME_BANNER_API(uuid), body: changes, header: authHeader(token) })
    return response.data.data
}

// `uuids` is every banner, in the new order; returns the saved list
export async function reorderHomeBanners(token: string | null, uuids: string[]): Promise<HomeBanner[]> {
    const response = await apiConnector({ method: "PATCH", url: REORDER_HOME_BANNERS_API, body: { uuids }, header: authHeader(token) })
    return response.data.data
}

export async function deleteHomeBanner(token: string | null, uuid: string): Promise<void> {
    await apiConnector({ method: "DELETE", url: HOME_BANNER_API(uuid), header: authHeader(token) })
}
