import type { MenuLink } from "@/lib/types/frontendTypes";

/** The right-side menu. `children` makes a small expandable sub-menu. */
export const MAIN_MENU_LINKS: MenuLink[] = [
    { label: "About", href: "https://akaraart.com/about" },
    {
        label: "Auction",
        href: "/",
        children: [
            { label: "Upcoming / Live", href: "/?tab=upcoming#auctions" },
            { label: "Past auctions", href: "/?tab=past#auctions", needsPastAuctions: true },
            // { label: "Live auction", href: "/?tab=upcoming#auctions" }, // used to open the Upcoming / Live tab
            { label: "Live auction", href: "/live-auction" },
            { label: "How to bid", href: "/#how-to-bid" },
            { label: "Absentee bid / Bidding increments", href: "/#absentee-bid" },
        ],
    },
    { label: "Artists", href: "https://akaraart.com/artists" },
    { label: "Press", href: "https://akaraart.com/press" },
    { label: "Notable Sales", href: "https://akaraart.com/notablesales" },
    { label: "Exhibition", href: "https://akaraart.com/exhibition/current" },
    { label: "Art fair", href: "https://akaraart.com/artfair/past" },
    { label: "Contact", href: "https://akaraart.com/contact" },
    { label: "Blogs", href: "https://akaraart.com/blogs" },
];

/** The online absentee bid form, under the downloadable form. Off until the client signs it off and the backend saves submissions. */
export const SHOW_ABSENTEE_BID = false;

export const FOOTER_CONTENT = {
    linkColumns: [
        {
            heading: "Auctions",
            links: [
                { label: "Upcoming / Live", href: "/?tab=upcoming#auctions" },
                { label: "Past", href: "/?tab=past#auctions", needsPastAuctions: true },
                { label: "Absentee bid / Bidding increments", href: "/#absentee-bid" },
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
