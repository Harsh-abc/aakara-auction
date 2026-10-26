import type { MenuLink } from "@/lib/types/frontendTypes";

/** The right-side menu. `children` makes a small expandable sub-menu. */
export const MAIN_MENU_LINKS: MenuLink[] = [
    { label: "About", href: "/about" },
    {
        label: "Auction",
        href: "/",
        children: [
            { label: "Upcoming / Live", href: "/?tab=upcoming#auctions" },
            { label: "Past auctions", href: "/?tab=past#auctions" },
            { label: "Live auction", href: "/?tab=upcoming#auctions" },
            { label: "How to bid", href: "/#how-to-bid" },
        ],
    },
    { label: "Artists", href: "/artists" },
    { label: "Press", href: "/press" },
    { label: "Notable Sales", href: "/notable-sales" },
    { label: "Exhibition", href: "/exhibition" },
    { label: "Art fair", href: "/art-fair" },
    { label: "Contact", href: "/contact" },
    { label: "Blogs", href: "/blogs" },
];

export const FOOTER_CONTENT = {
    aboutText: "An auction house for modern and contemporary South Asian art, pairing carefully researched catalogues with transparent online bidding.",
    linkColumns: [
        {
            heading: "Auctions",
            links: [
                { label: "Upcoming / Live", href: "/?tab=upcoming#auctions" },
                { label: "Past", href: "/?tab=past#auctions" },
                { label: "Live Auction", href: "/?tab=upcoming#auctions" },
            ],
        },
        {
            heading: "Buying",
            links: [
                { label: "How to bid", href: "/#how-to-bid" },
                { label: "Valuations", href: "/valuations" },
                { label: "Shipping & collection", href: "/shipping" },
            ],
        },
    ],
    contactLines: ["Mumbai · Kala Ghoda", "+91 22 0000 0000", "bids@akaraart.com", "Mon–Sat, 10am–6pm IST"],
    /** Links in the purple bar at the very bottom */
    legalLinks: [
        { label: "Conditions of auction", href: "/terms" },
        { label: "FAQs", href: "/faqs" },
        { label: "Privacy", href: "/privacy" },
    ],
};
