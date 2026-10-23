// laptop / desktop ≥ 1024px, tablet 768–1023px, mobile < 768px
export type BannerDevice = "desktop" | "tablet" | "mobile"

// storefront hero image (Settings → Website) — a laptop image plus optional tablet / mobile
// versions; sizes are the image's pixels (null for images uploaded before sizes were kept)
export interface PublicHomeBanner {
    uuid: string
    imageUrl: string
    imageWidth: number | null
    imageHeight: number | null
    tabletImageUrl: string | null
    tabletImageWidth: number | null
    tabletImageHeight: number | null
    mobileImageUrl: string | null
    mobileImageWidth: number | null
    mobileImageHeight: number | null
    altText: string | null
    // a site path ("/auctions/…") or a full URL
    linkUrl: string | null
}

export interface HomeBanner extends PublicHomeBanner {
    sortOrder: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface HomeBannerChanges {
    altText?: string | null
    linkUrl?: string | null
    isActive?: boolean
}

export interface ImageSize {
    width: number
    height: number
}
