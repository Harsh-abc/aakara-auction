"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import type { BannerDevice, PublicHomeBanner } from "@/lib/types/website.types";
import { cn } from "@/lib/utils";

const SLIDE_MS = 6000;

// laptop ≥ 1024px (Tailwind lg), tablet ≥ 768px (md), mobile below
const TABLET_MEDIA = "(min-width: 768px)";
const DESKTOP_MEDIA = "(min-width: 1024px)";

// the hero's shape when an image has no recorded size — the storefront's original 8:3 / 4:3
const DEFAULT_RATIO = { desktop: 8 / 3, tablet: 8 / 3, mobile: 4 / 3 };

// the house banner's frame (Figma "hero banner") — same as FeaturedAuction's BANNER
const HOUSE_FRAME = "relative aspect-4/3 w-full overflow-hidden bg-[#ebebeb] sm:aspect-8/3";

const ratio = (width: number | null, height: number | null) => (width && height ? width / height : null);

/**
 * The image a device shows and the hero's shape there. Missing versions fall back:
 * tablet → laptop image (laptop shape); mobile → tablet or laptop image, cropped to 4:3.
 */
export function bannerVariant(banner: PublicHomeBanner, device: BannerDevice) {
    const desktop = { url: banner.imageUrl, ratio: ratio(banner.imageWidth, banner.imageHeight) ?? DEFAULT_RATIO.desktop };
    if (device === "desktop") return desktop;

    const tablet = banner.tabletImageUrl
        ? { url: banner.tabletImageUrl, ratio: ratio(banner.tabletImageWidth, banner.tabletImageHeight) ?? DEFAULT_RATIO.tablet }
        : desktop;
    if (device === "tablet") return tablet;

    return banner.mobileImageUrl
        ? { url: banner.mobileImageUrl, ratio: ratio(banner.mobileImageWidth, banner.mobileImageHeight) ?? DEFAULT_RATIO.mobile }
        : { url: tablet.url, ratio: DEFAULT_RATIO.mobile };
}

// the house banner — shown until Settings → Website has images
export function HouseBanner({ priority }: { priority?: boolean }) {
    return (
        <Image
            src="/banners/inaugural-coming-soon.png"
            alt="Akara — inaugural fine art auction, coming soon"
            fill
            priority={priority}
            sizes="(min-width: 1200px) 1150px, 100vw"
            className="object-cover"
        />
    );
}

function BannerLink({ href, label, tabIndex, children }: { href: string; label: string; tabIndex?: number; children: React.ReactNode }) {
    const className = "absolute inset-0 block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white";
    // full URLs leave the site in a new tab; paths stay in the app
    return /^https?:\/\//i.test(href) ? (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} tabIndex={tabIndex} className={className}>
            {children}
        </a>
    ) : (
        <Link href={href} aria-label={label} tabIndex={tabIndex} className={className}>
            {children}
        </Link>
    );
}

// one slide's image: the browser picks the version for the screen, unless `device` forces one (preview)
function BannerImage({ banner, alt, eager, device }: { banner: PublicHomeBanner; alt: string; eager: boolean; device?: BannerDevice }) {
    const imgProps = {
        loading: eager ? ("eager" as const) : ("lazy" as const),
        fetchPriority: eager ? ("high" as const) : undefined,
        className: "h-full w-full object-cover",
    };

    // S3 URLs aren't in next.config images — plain <img>, like auction covers
    if (device) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={bannerVariant(banner, device).url} alt={alt} {...imgProps} />;
    }

    // <picture> already picks one source per screen, so next/image's lint rule doesn't apply
    return (
        <picture>
            <source media={DESKTOP_MEDIA} srcSet={bannerVariant(banner, "desktop").url} />
            <source media={TABLET_MEDIA} srcSet={bannerVariant(banner, "tablet").url} />
            <img src={bannerVariant(banner, "mobile").url} alt={alt} {...imgProps} />
        </picture>
    );
}

/**
 * Fills its (relative, sized) parent with the banners, cross-fading between them.
 * Pauses on hover and for visitors who prefer reduced motion.
 */
export function HomeBannerSlides({ banners, priority, device }: { banners: PublicHomeBanner[]; priority?: boolean; device?: BannerDevice }) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = banners.length;
    // the list can shrink under us (dashboard preview)
    const current = count ? active % count : 0;

    useEffect(() => {
        if (count < 2 || paused) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const id = setInterval(() => setActive((i) => (i + 1) % count), SLIDE_MS);
        return () => clearInterval(id);
    }, [count, paused]);

    if (!count) return <HouseBanner priority={priority} />;

    return (
        <div
            className="absolute inset-0"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-roledescription={count > 1 ? "carousel" : undefined}
        >
            {banners.map((banner, index) => {
                const visible = index === current;
                const alt = banner.altText || "Aakara — fine art auctions";
                const image = <BannerImage banner={banner} alt={alt} eager={index === 0 && !!priority} device={device} />;
                return (
                    <div
                        key={banner.uuid}
                        className={cn(
                            "absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
                            visible ? "opacity-100" : "pointer-events-none opacity-0",
                        )}
                        aria-hidden={!visible}
                        aria-roledescription={count > 1 ? "slide" : undefined}
                        aria-label={count > 1 ? `${index + 1} of ${count}` : undefined}
                    >
                        {banner.linkUrl ? (
                            <BannerLink href={banner.linkUrl} label={alt} tabIndex={visible ? undefined : -1}>
                                {image}
                            </BannerLink>
                        ) : (
                            image
                        )}
                    </div>
                );
            })}

            {count > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 sm:bottom-4">
                    {banners.map((banner, index) => (
                        <button
                            key={banner.uuid}
                            type="button"
                            onClick={() => setActive(index)}
                            aria-label={`Show banner ${index + 1}`}
                            aria-current={index === current ? "true" : undefined}
                            className={cn(
                                "h-1.5 cursor-pointer rounded-full bg-white/50 shadow-sm transition-all hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                                index === current ? "w-6 bg-white" : "w-1.5",
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * The hero's banner area. Takes the shape of the first banner's image for each screen size
 * (laptop / tablet / mobile), so a portrait mobile image shows whole instead of cropped;
 * later banners fill the same frame. `device` pins one size (dashboard preview).
 */
export function HomeBannerHero({ banners, priority, device }: { banners: PublicHomeBanner[]; priority?: boolean; device?: BannerDevice }) {
    if (!banners.length) {
        return (
            <div className={HOUSE_FRAME} style={device ? { aspectRatio: DEFAULT_RATIO[device] } : undefined}>
                <HouseBanner priority={priority} />
            </div>
        );
    }

    const first = banners[0];
    const style = device
        ? { aspectRatio: bannerVariant(first, device).ratio }
        : ({
              "--hero-mobile": bannerVariant(first, "mobile").ratio,
              "--hero-tablet": bannerVariant(first, "tablet").ratio,
              "--hero-desktop": bannerVariant(first, "desktop").ratio,
          } as CSSProperties);

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden bg-[#ebebeb]",
                !device && "aspect-(--hero-mobile) md:aspect-(--hero-tablet) lg:aspect-(--hero-desktop)",
            )}
            style={style}
        >
            <HomeBannerSlides banners={banners} priority={priority} device={device} />
        </div>
    );
}
