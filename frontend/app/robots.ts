import type { MetadataRoute } from "next"

// /robots.txt — no crawler, search engine or AI bot may crawl any page.
// (Backed up by the noindex meta in app/layout.tsx and the X-Robots-Tag header in next.config.ts.)
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", disallow: "/" }],
    }
}
