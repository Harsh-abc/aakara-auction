-- AlterTable
ALTER TABLE "users" ADD COLUMN     "biddingLimit" DECIMAL(12,2),
ADD COLUMN     "biddingLimitCurrency" VARCHAR(3),
ADD COLUMN     "biddingLimitSetAt" TIMESTAMP(3),
ADD COLUMN     "biddingLimitSetById" BIGINT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_biddingLimitSetById_fkey" FOREIGN KEY ("biddingLimitSetById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
