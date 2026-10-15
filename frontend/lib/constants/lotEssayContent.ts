/**
 * STATIC catalogue essay for the individual lot page (Figma: "Auction — Individual Lot", essay section).
 * Placeholder copy for the client demo — replace with the lot's API data later.
 * The essay is an ordered list of blocks; `components/core/frontend/auctions/lot/StaticLotEssay.tsx` lays them out.
 */

export type EssayFigure = {
    /** the label on the hatched placeholder, shown when there's no image */
    label: string;
    caption: string;
    /** the figure box's Tailwind aspect class (width / height from the Figma frame) — a full class so Tailwind sees it */
    aspect: string;
};

export type EssayBlock =
    | { type: "heading"; text: string }
    | { type: "paragraph"; text: string; /** a phrase set in italics (a work title) */ italic?: string }
    | { type: "figure"; figure: EssayFigure }
    // a narrow figure beside a heading + paragraph (Figma "Letter" aside)
    | { type: "aside"; figure: EssayFigure; heading: string; text: string }
    | { type: "quote"; text: string };

export const LOT_ESSAY_BLOCKS: EssayBlock[] = [
    { type: "heading", text: "The human and the divine" },
    {
        type: "paragraph",
        italic: "Work title",
        text: "Work title is a painting in which the artist's India — rural, ancient, sensual, sacred and modern — coalesces with exceptional force. Monumental in its horizontal format and saturated in crimson, ochre and blue, the painting transforms an intimate scene of rural life into an image of union, fertility and generative energy. The painting is further distinguished by an exceptional history: it belonged to pioneering collectors of modern Indian art and was selected for a landmark early museum presentation of the artist abroad. It now returns to auction after more than twenty-five years.",
    },

    { type: "heading", text: "A painting with a history" },
    {
        type: "figure",
        figure: {
            label: "Archive photograph",
            caption: "Photograph of the artist with the collectors, Mumbai, 1974. Courtesy of the family archive.",
            aspect: "aspect-[672/815]",
        },
    },
    {
        type: "paragraph",
        text: "India made an immediate and lasting impression on the collectors. Their commitment to Indian modern art deepened after encountering the artist's work at the National Gallery of Modern Art in Delhi, a work remembered for the energy of its gesture, its colour and its evocation of “epic carving”. Over the following decades they built a collection of more than three thousand works and became among the most consequential advocates for Indian modern art abroad. The artist remained central to their vision, not only as a painter they collected in depth but as a figure whose international reception they actively championed.",
    },

    {
        type: "aside",
        figure: {
            label: "Letter",
            caption: "Correspondence between the collector and the gallery, 18 March 1974. Family archive.",
            aspect: "aspect-[250/280]",
        },
        heading: "“Farmer couple on a sun-burnt field”",
        text: "Rendered in deep crimson and layered with warm oranges, ochres, deep blue and pale grey, the painting presents a farmer and his wife in a moment of intimate companionship. Its title is crucial: the Sanskrit word for a pair, couple or union carries a long history in Indian art, where paired figures evoke fertility, auspiciousness and the generative forces of life. The artist translates this ancient archetype into the language of modern India. For the 1974 exhibition the collectors asked the artist to describe the works on view; his own account of the painting provides the essential key to it:",
    },

    {
        type: "quote",
        text: "Farmer couple on a sun-burnt field. Wife has brought the mid day meal. Pair of bulls untied. Tiger head below invokes the goddess of fertility.",
    },

    {
        type: "figure",
        figure: {
            label: "Underwriter note",
            caption: "The artist's note to the collector, 12 September 1974. Family archive.",
            aspect: "aspect-[672/300]",
        },
    },
    {
        type: "paragraph",
        text: "The artist's description anchors the work firmly in rural life. The blazing crimson disc evokes the heat of the sun-burnt field; the wife brings the midday meal; and the untied bulls embody release, vitality and generative force. The tiger head below, explicitly identified as invoking the goddess of fertility, extends the couple's intimacy into a broader meditation on fecundity and creation. Formally, the artist binds these elements through angular planes, muscular black line and a compressed, cinematic horizontal field.",
    },

    { type: "heading", text: "From the primordial to the divine" },
    {
        type: "paragraph",
        text: "The theme of the paired couple occupied the artist repeatedly during the 1960s, allowing him to explore it across the primordial, human and divine. In an earlier canvas he strips the couple of individual identity: compressed into an almost totemic configuration and entwined with vigorous animal forms, they assume something elemental — the pair as archetype, a primordial image of union.",
    },
    {
        type: "figure",
        figure: {
            label: "Comparative work",
            caption: "Artist name, comparative work, 1966. Image reproduced from the artist's monograph.",
            aspect: "aspect-[672/775]",
        },
    },
    {
        type: "paragraph",
        text: "By 1966 that archetype assumes an explicitly divine form as the sacred couple celebrated for centuries in Indian art. The present work is the point at which those strands meet: the everyday couple of the fields, painted with the monumentality of the gods.",
    },
];
