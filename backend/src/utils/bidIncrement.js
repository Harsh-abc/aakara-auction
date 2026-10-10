/**
 * Smallest bid the next bidder may place on a lot.
 *   no bids yet  → the starting price
 *   otherwise    → current bid + the increment from the auction's BID_INCREMENT rules
 *                  (the rule whose rangeMin..rangeMax holds the current bid),
 *                  falling back to ~5% rounded up to a tidy step (₹5,50,000 → ₹5,80,000)
 */
const defaultIncrement = (current) => {
    const raw = current * 0.05;
    if (raw <= 1) return 1;
    const step = 10 ** Math.floor(Math.log10(raw)) / 2;
    return Math.ceil(raw / step) * step;
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
    const increment = rule
        ? rule.valueType === "PERCENTAGE"
            ? Math.ceil((current * Number(rule.value)) / 100)
            : Number(rule.value)
        : defaultIncrement(current);

    return current + increment;
};
