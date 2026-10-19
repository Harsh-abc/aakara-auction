-- AlterTable
ALTER TABLE "auto_bids" ADD COLUMN     "ipAddress" VARCHAR(64),
ADD COLUMN     "userAgent" VARCHAR(500),
ADD COLUMN     "withdrawnAt" TIMESTAMP(3),
ADD COLUMN     "withdrawnReason" VARCHAR(200);

-- CreateIndex
CREATE INDEX "auto_bids_createdAt_idx" ON "auto_bids"("createdAt");

-- CreateIndex
CREATE INDEX "auto_bids_ipAddress_idx" ON "auto_bids"("ipAddress");
