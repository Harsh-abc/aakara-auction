import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // the auctions listing lives at "/" — keep old /auctions links working (sale pages stay under /auctions/:uuid)
    return [
      { source: "/auctions", destination: "/", permanent: false },
      // the old staff login / sign-up pages are gone — /registration is the one login page (query, e.g. ?redirect=, is kept)
      { source: "/login", destination: "/registration", permanent: true },
      { source: "/signup", destination: "/registration?tab=signup", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // the live player can be iframed on other sites (set to your domains in production,
        // e.g. "frame-ancestors https://akaraart.com")
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
};

export default nextConfig;
