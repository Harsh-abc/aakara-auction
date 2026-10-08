import type { MenuLink, QuestionAndAnswer } from "@/lib/types/frontendTypes";

/** The right-side menu. `children` makes a small expandable sub-menu. */
export const MAIN_MENU_LINKS: MenuLink[] = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    {
        label: "Auction",
        href: "/auctions",
        children: [
            { label: "Upcoming / Live", href: "/auctions?tab=upcoming" },
            { label: "Past auctions", href: "/auctions?tab=past" },
            { label: "Live auction", href: "/auctions/autumn-auction-2026/live" },
            { label: "How to bid", href: "/how-to-bid" },
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
                { label: "Upcoming / Live", href: "/auctions?tab=upcoming" },
                { label: "Past", href: "/auctions?tab=past" },
                { label: "Live Auction", href: "/auctions/autumn-auction-2026/live" },
            ],
        },
        {
            heading: "Buying",
            links: [
                { label: "How to bid", href: "/how-to-bid" },
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
