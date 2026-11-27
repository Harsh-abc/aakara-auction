-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phoneBidderAt" TIMESTAMP(3),
ADD COLUMN     "phoneBidderById" BIGINT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_phoneBidderById_fkey" FOREIGN KEY ("phoneBidderById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
