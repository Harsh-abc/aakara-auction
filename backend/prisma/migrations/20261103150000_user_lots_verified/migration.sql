-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lotsVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lotsVerifiedById" BIGINT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lotsVerifiedById_fkey" FOREIGN KEY ("lotsVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
