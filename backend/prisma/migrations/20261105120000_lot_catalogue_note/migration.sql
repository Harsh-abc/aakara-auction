-- Free-text catalogue lines shown under "Lot details > Description" on the lot page
ALTER TABLE "auction_items" ADD COLUMN "catalogueNote" TEXT;
