-- CreateTable
CREATE TABLE "live_stream_bans" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "identity" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120),
    "bannedBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_stream_bans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_stream_bans_auctionId_idx" ON "live_stream_bans"("auctionId");

-- CreateIndex
CREATE UNIQUE INDEX "live_stream_bans_auctionId_identity_key" ON "live_stream_bans"("auctionId", "identity");

-- AddForeignKey
ALTER TABLE "live_stream_bans" ADD CONSTRAINT "live_stream_bans_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_stream_bans" ADD CONSTRAINT "live_stream_bans_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

