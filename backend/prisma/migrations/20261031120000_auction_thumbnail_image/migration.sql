-- A separate thumbnail for the storefront's auction list rows. Optional, so
-- existing auctions keep showing their cover image until one is uploaded.

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN "thumbnailImageUrl" TEXT;
