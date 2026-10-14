/**
 * Smallest bid the next bidder may place on a lot.
 *   no bids yet  → the starting price
 *   otherwise    → current bid + the increment from the auction's BID_INCREMENT rules
 *                  (the rule whose rangeMin..rangeMax holds the current bid),
 *                  falling back to the house increment chart (ladderAbove)
 */

/**
 * The house increment chart, in tenths of a decade. It repeats every decade and
 * is the same in every currency (₹10,000–₹1,00,000 shown; USD 1,000–10,000 alike):
 *   10–20   by 1     ₹10,000 – ₹20,000      by ₹1,000
 *   20–30   by 2     ₹20,000 – ₹30,000      by ₹2,000
 *   30–50   2-5-8    ₹32,000, 35,000, 38,000, 40,000, 42,000 …
 *   50–100  by 5     ₹50,000 – ₹1,00,000    by ₹5,000
 * Mirrored in libs/biddingStore.js — keep the two in step.
 */
const LADDER = [
    10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 22, 24, 26, 28,
    30, 32, 35, 38, 40, 42, 45, 48,
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
    100,
];

/** The first step of the chart above `current` (₹12,000 → ₹13,000, ₹32,000 → ₹35,000, ₹38,000 → ₹40,000). */
export const ladderAbove = (current) => {
    if (current < 10) return Math.floor(current) + 1;
    let decade = 10 ** Math.floor(Math.log10(current));
    if (decade > current) decade /= 10;
    else if (decade * 10 <= current) decade *= 10;
    const unit = decade / 10;
    return LADDER.find((tenths) => tenths * unit > current) * unit;
};

/**
 * @param {{ startingPrice: unknown, currentBid: unknown, bidCount: unknown }} lot
 * @param {{ valueType: "FIXED" | "PERCENTAGE", rangeMin: unknown, rangeMax: unknown, value: unknown }[]} rules active BID_INCREMENT rules
 */
export const nextValidBid = (lot, rules = []) => {
    const current = lot.currentBid === null ? null : Number(lot.currentBid);
    if (!Number(lot.bidCount) || current === null) return Number(lot.startingPrice);

    const rule = rules.find(
        (r) => (r.rangeMin === null || current >= Number(r.rangeMin)) && (r.rangeMax === null || current < Number(r.rangeMax))
    );
    if (!rule) return ladderAbove(current);

    const increment = rule.valueType === "PERCENTAGE" ? Math.ceil((current * Number(rule.value)) / 100) : Number(rule.value);
    return current + increment;
};

/** The bids a bidder picks from: the next valid bid and the `count - 1` steps above it (₹32,000 → ₹32,000 / 35,000 / 38,000). */
export const bidOptions = (nextBid, rules = [], count = 3) => {
    const options = [Number(nextBid)];
    while (options.length < count) options.push(nextValidBid({ currentBid: options.at(-1), bidCount: 1 }, rules));
    return options;
};
