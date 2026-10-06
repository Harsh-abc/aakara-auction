-- Registration approval (auction_participants.status / approvedAt / approvedBy):
--   - added by a super admin  -> approved when added
--   - self-registered         -> approved when first verified on a lot
-- Backfill rows created before that rule. The approver is whoever first
-- verified the user on one of the auction's lots; for admin-added rows that
-- were never verified, it's the admin who created the account.
WITH first_verification AS (
    SELECT DISTINCT ON (ai."auctionId", lb."userId")
        ai."auctionId", lb."userId", lb."verifiedAt", lb."verifiedBy"
    FROM "lot_bidders" lb
    JOIN "auction_items" ai ON ai."id" = lb."itemId"
    WHERE lb."status" = 'VERIFIED'
    ORDER BY ai."auctionId", lb."userId", lb."verifiedAt"
)
UPDATE "auction_participants" ap
SET "status" = 'APPROVED',
    "approvedAt" = COALESCE(fv."verifiedAt", ap."registeredAt"),
    "approvedBy" = COALESCE(fv."verifiedBy", u."createdById")
FROM "auction_participants" p
JOIN "users" u ON u."id" = p."userId"
LEFT JOIN first_verification fv ON fv."auctionId" = p."auctionId" AND fv."userId" = p."userId"
WHERE ap."id" = p."id"
  AND ap."status" = 'PENDING'
  AND (ap."source" = 'ADDED_BY_ADMIN' OR fv."userId" IS NOT NULL);
