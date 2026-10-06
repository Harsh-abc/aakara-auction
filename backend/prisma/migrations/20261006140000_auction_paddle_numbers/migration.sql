-- Paddle numbers: unique per auction, issued from a per-auction counter.
-- Paddle = 100 + counter (first paddle is 101) — matches PADDLE_START in
-- src/services/auctionParticipant.services.js.

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN "paddleCounter" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing registrations in the order they registered
WITH numbered AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "auctionId" ORDER BY "registeredAt", "id") AS n
    FROM "auction_participants"
)
UPDATE "auction_participants" ap
SET "paddleNumber" = (100 + numbered.n)::TEXT
FROM numbered
WHERE ap."id" = numbered."id";

UPDATE "auctions" a
SET "paddleCounter" = c.cnt
FROM (SELECT "auctionId", COUNT(*) AS cnt FROM "auction_participants" GROUP BY "auctionId") c
WHERE a."id" = c."auctionId";

-- AlterTable
ALTER TABLE "auction_participants" ALTER COLUMN "paddleNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "auction_participants_auctionId_paddleNumber_key" ON "auction_participants"("auctionId", "paddleNumber");
