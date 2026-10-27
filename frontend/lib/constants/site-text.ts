import type { MenuLink } from "@/lib/types/frontendTypes";

/** The right-side menu. `children` makes a small expandable sub-menu. */
export const MAIN_MENU_LINKS: MenuLink[] = [
    { label: "About", href: "/about" },
    {
        label: "Auction",
        href: "/",
        children: [
            { label: "Upcoming / Live", href: "/?tab=upcoming#auctions" },
            { label: "Past auctions", href: "/?tab=past#auctions", needsPastAuctions: true },
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

/** The "Absentee bid" section under How to bid (the footer link points to it once on). Off until the client signs it off and the backend saves submissions. */
export const SHOW_ABSENTEE_BID = false;

export const FOOTER_CONTENT = {
    linkColumns: [
        {
            heading: "Auctions",
            links: [
                { label: "Upcoming / Live", href: "/?tab=upcoming#auctions" },
                { label: "Past", href: "/?tab=past#auctions", needsPastAuctions: true },
                // goes nowhere until the absentee bid section is switched on, then points at it
                { label: "Absentee bid / Bidding increments", href: SHOW_ABSENTEE_BID ? "/#absentee-bid" : "#" },
            ] as MenuLink[],
        },
        {
            heading: "Buying",
            links: [
                { label: "FAQs", href: "/faq" },
                { label: "Terms & conditions of sale", href: "/terms" },
            ] as MenuLink[],
        },
    ],
    contactLines: ["3C Amarchand Mansion, 2nd Floor, 16 Madam Cama Road, Mumbai 400001, India", "auction@akaraart.com", "+91 98209 41300"],
};

export const AUCTION_EMAIL = "auction@akaraart.com";
