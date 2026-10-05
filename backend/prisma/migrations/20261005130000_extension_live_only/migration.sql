-- Extended bidding now applies to LIVE auctions only, with no default duration.

-- Non-LIVE auctions never extend
DELETE FROM "auction_rules" AS r
USING "auctions" AS a
WHERE a."id" = r."auctionId"
  AND r."ruleType" = 'EXTENSION_TRIGGER'
  AND a."auctionType" <> 'LIVE';

-- Drop the old 2-minute default (the edit form already treated 2 as "off")
DELETE FROM "auction_rules"
WHERE "ruleType" = 'EXTENSION_TRIGGER'
  AND "value" = 2;
