-- Per-auction switch for proxy (maximum) bids. On by default, so existing
-- auctions keep taking proxy bids until staff turn it off.

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN "proxyBiddingEnabled" BOOLEAN NOT NULL DEFAULT true;
