-- Registered bidders are now verified on every lot by default (the per-lot
-- "Manage Bidders" verification step is gone). Verify the lot rows still
-- PENDING on auctions that aren't over, and approve those registrations.
-- Bidding is still gated by the account itself (active, BIDDER role, KYC verified).

UPDATE "lot_bidders" lb
SET "status" = 'VERIFIED',
    "verifiedAt" = NOW(),
    "updatedAt" = NOW()
FROM "auction_items" ai
JOIN "auctions" a ON a."id" = ai."auctionId"
WHERE lb."itemId" = ai."id"
  AND lb."status" = 'PENDING'
  AND a."deletedAt" IS NULL
  AND a."status" IN ('DRAFT', 'SCHEDULED', 'PREVIEW', 'LIVE', 'PAUSED');

UPDATE "auction_participants" ap
SET "status" = 'APPROVED',
    "approvedAt" = NOW(),
    "updatedAt" = NOW()
FROM "auctions" a
WHERE ap."auctionId" = a."id"
  AND ap."status" = 'PENDING'
  AND a."deletedAt" IS NULL
  AND a."status" IN ('DRAFT', 'SCHEDULED', 'PREVIEW', 'LIVE', 'PAUSED');
