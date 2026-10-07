-- AlterTable
ALTER TABLE "user_kyc" ADD COLUMN     "requestNote" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "requestedBy" BIGINT,
ADD COLUMN     "requestedDocuments" "DocumentType"[] DEFAULT ARRAY[]::"DocumentType"[];

-- CreateIndex
CREATE INDEX "user_kyc_requestedBy_idx" ON "user_kyc"("requestedBy");

-- AddForeignKey
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
