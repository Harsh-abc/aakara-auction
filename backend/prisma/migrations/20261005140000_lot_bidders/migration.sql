-- CreateEnum
CREATE TYPE "LotBidderStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "LotBidderSource" AS ENUM ('SELF_REGISTERED', 'ADDED_BY_ADMIN');

-- CreateTable
CREATE TABLE "lot_bidders" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "itemId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "source" "LotBidderSource" NOT NULL DEFAULT 'SELF_REGISTERED',
    "status" "LotBidderStatus" NOT NULL DEFAULT 'PENDING',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_bidders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lot_bidders_uuid_key" ON "lot_bidders"("uuid");

-- CreateIndex
CREATE INDEX "lot_bidders_itemId_idx" ON "lot_bidders"("itemId");

-- CreateIndex
CREATE INDEX "lot_bidders_userId_idx" ON "lot_bidders"("userId");

-- CreateIndex
CREATE INDEX "lot_bidders_status_idx" ON "lot_bidders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lot_bidders_itemId_userId_key" ON "lot_bidders"("itemId", "userId");

-- AddForeignKey
ALTER TABLE "lot_bidders" ADD CONSTRAINT "lot_bidders_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_bidders" ADD CONSTRAINT "lot_bidders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_bidders" ADD CONSTRAINT "lot_bidders_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

