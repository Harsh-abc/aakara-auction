-- Settings → Live Access: an auction can be restricted so that, while it's LIVE / PAUSED,
-- only staff and the bidders picked for it see it. Off by default, so nothing changes until switched on.

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN "liveAccessRestricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "auction_live_viewers" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "addedById" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_live_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auction_live_viewers_auctionId_userId_key" ON "auction_live_viewers"("auctionId", "userId");

-- CreateIndex
CREATE INDEX "auction_live_viewers_userId_idx" ON "auction_live_viewers"("userId");

-- AddForeignKey
ALTER TABLE "auction_live_viewers" ADD CONSTRAINT "auction_live_viewers_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_live_viewers" ADD CONSTRAINT "auction_live_viewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_live_viewers" ADD CONSTRAINT "auction_live_viewers_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
