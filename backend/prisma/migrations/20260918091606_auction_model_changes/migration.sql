/*
  Warnings:

  - Added the required column `editionType` to the `auction_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EDITIONTYPE" AS ENUM ('UNIQUE', 'LIMITED', 'OPEN');

-- AlterTable
ALTER TABLE "auction_documents" ALTER COLUMN "fileSize" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "auction_extensions" ALTER COLUMN "extensionSeconds" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "auction_fees" ALTER COLUMN "sortOrder" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "auction_images" ALTER COLUMN "sortOrder" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "auction_items" ADD COLUMN     "acquisitionDate" TEXT,
ADD COLUMN     "acquisitionMethod" TEXT,
ADD COLUMN     "auctheticateDate" TIMESTAMP(3),
ADD COLUMN     "authenticateBy" TEXT,
ADD COLUMN     "detailedConditionNotes" TEXT,
ADD COLUMN     "editionType" "EDITIONTYPE" NOT NULL,
ADD COLUMN     "exhibitionHistory" TEXT,
ADD COLUMN     "frameCondition" TEXT,
ADD COLUMN     "gstRate" DECIMAL(12,2),
ADD COLUMN     "hsnCode" DECIMAL(12,2),
ADD COLUMN     "insureanceValue" DECIMAL(12,2),
ADD COLUMN     "overallCondition" TEXT,
ADD COLUMN     "previousOwner" TEXT,
ADD COLUMN     "restorationHistory" TEXT,
ALTER COLUMN "itemNumber" SET DATA TYPE BIGINT,
ALTER COLUMN "bidCount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "sortOrder" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "sub_categories" ALTER COLUMN "sortOrder" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "user_kyc_documents" ALTER COLUMN "fileSize" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "failedLoginAttempts" SET DATA TYPE BIGINT;
