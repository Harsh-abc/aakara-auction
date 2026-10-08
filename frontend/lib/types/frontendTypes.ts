export interface QuestionAndAnswer {
    question: string;
    answer: string;
}

export interface MenuLink {
    label: string;
    href: string;
    /** Sub-links (e.g. the "Auction" menu item opens a small list) */
    children?: MenuLink[];
}
