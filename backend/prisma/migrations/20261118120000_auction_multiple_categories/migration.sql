-- An auction can cover several categories; each lot picks one of them (+ its own subcategory).
-- auctions.categoryId stays as the primary (first) category.

-- CreateTable
CREATE TABLE "auction_categories" (
    "auctionId" BIGINT NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_categories_pkey" PRIMARY KEY ("auctionId","categoryId")
);

-- CreateIndex
CREATE INDEX "auction_categories_categoryId_idx" ON "auction_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "auction_categories" ADD CONSTRAINT "auction_categories_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_categories" ADD CONSTRAINT "auction_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing auction gets its current category as the primary one
INSERT INTO "auction_categories" ("auctionId", "categoryId", "sortOrder")
SELECT "id", "categoryId", 0 FROM "auctions"
ON CONFLICT DO NOTHING;

-- Backfill: lots without a category inherit the auction's
UPDATE "auction_items" AS i
SET "categoryId" = a."categoryId"
FROM "auctions" AS a
WHERE i."auctionId" = a."id" AND i."categoryId" IS NULL;
