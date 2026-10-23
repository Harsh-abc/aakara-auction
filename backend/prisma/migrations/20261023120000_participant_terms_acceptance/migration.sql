-- AlterTable
ALTER TABLE "auction_participants" ADD COLUMN     "auctionTermsAccepted" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedIp" VARCHAR(64),
ADD COLUMN     "termsAcceptedUserAgent" VARCHAR(500),
ADD COLUMN     "termsVersion" VARCHAR(32);

-- CreateIndex
CREATE INDEX "auction_participants_termsVersion_idx" ON "auction_participants"("termsVersion");
