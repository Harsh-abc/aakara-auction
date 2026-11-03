-- "Floor Auction" is now "Online Auction". Renaming the enum value keeps every
-- existing FLOOR auction, now as ONLINE; the column default follows the rename.

-- AlterEnum
ALTER TYPE "AuctionType" RENAME VALUE 'FLOOR' TO 'ONLINE';

-- AlterTable
ALTER TABLE "auctions" ALTER COLUMN "auctionType" SET DEFAULT 'ONLINE';
