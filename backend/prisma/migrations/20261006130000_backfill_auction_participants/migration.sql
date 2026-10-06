-- Registration now happens per auction. Users who got onto a lot through the
-- old per-lot flows become registrants of that lot's auction...
INSERT INTO "auction_participants" ("auctionId", "userId", "source", "registeredAt", "updatedAt")
SELECT
    ai."auctionId",
    lb."userId",
    (CASE WHEN bool_or(lb."source" = 'SELF_REGISTERED') THEN 'SELF_REGISTERED' ELSE 'ADDED_BY_ADMIN' END)::"LotBidderSource",
    MIN(lb."registeredAt"),
    CURRENT_TIMESTAMP
FROM "lot_bidders" lb
JOIN "auction_items" ai ON ai."id" = lb."itemId"
GROUP BY ai."auctionId", lb."userId"
ON CONFLICT ("auctionId", "userId") DO NOTHING;

-- ...and, like every registrant, get a PENDING row on every lot of it.
-- Existing rows (e.g. already VERIFIED) are kept as they are.
INSERT INTO "lot_bidders" ("uuid", "itemId", "userId", "source", "registeredAt", "updatedAt")
SELECT gen_random_uuid(), ai."id", ap."userId", ap."source", ap."registeredAt", CURRENT_TIMESTAMP
FROM "auction_participants" ap
JOIN "auction_items" ai ON ai."auctionId" = ap."auctionId"
ON CONFLICT ("itemId", "userId") DO NOTHING;
