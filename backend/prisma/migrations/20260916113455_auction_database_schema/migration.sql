/*
  Warnings:

  - You are about to drop the column `currency` on the `auctions` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `auctions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyId` to the `auctions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `auctions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationStarts` to the `auctions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `auctions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuctionFeeType" AS ENUM ('BUYER_PREMIUM', 'PLATFORM_FEE', 'TAX_GST', 'PAYMENT_PROCESSING', 'LATE_PAYMENT', 'SHIPPING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FeeCalculationType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "ShippingStrategy" AS ENUM ('SHIPPING_INCLUDED', 'SHIPPING_CALCULATED_SEPARATELY', 'BUYER_ARRANGES_PICKUP', 'ADMIN_ARRANGES_DELIVERY');

-- CreateEnum
CREATE TYPE "AuctionVisibility" AS ENUM ('PUBLIC', 'REGISTERED_USERS_ONLY', 'PRIVATE_INVITE_ONLY');

-- DropForeignKey
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_categoryId_fkey";

-- DropIndex
DROP INDEX "auction_items_categoryId_idx";

-- DropIndex
DROP INDEX "auction_items_subCategoryId_idx";

-- AlterTable
ALTER TABLE "auction_items" ADD COLUMN     "currencyId" BIGINT,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "auctions" DROP COLUMN "currency",
ADD COLUMN     "categoryId" BIGINT NOT NULL,
ADD COLUMN     "currencyId" BIGINT NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "registrationStarts" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "shippingStrategy" "ShippingStrategy" NOT NULL DEFAULT 'SHIPPING_CALCULATED_SEPARATELY',
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "subCategoryId" BIGINT,
ADD COLUMN     "visibility" "AuctionVisibility" NOT NULL DEFAULT 'REGISTERED_USERS_ONLY';

-- CreateTable
CREATE TABLE "currencies" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_tags" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_tag_relations" (
    "auctionId" BIGINT NOT NULL,
    "tagId" BIGINT NOT NULL,

    CONSTRAINT "auction_tag_relations_pkey" PRIMARY KEY ("auctionId","tagId")
);

-- CreateTable
CREATE TABLE "auction_fees" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "feeType" "AuctionFeeType" NOT NULL,
    "name" TEXT NOT NULL,
    "calculationType" "FeeCalculationType" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "auction_tags_name_key" ON "auction_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "auction_tags_slug_key" ON "auction_tags"("slug");

-- CreateIndex
CREATE INDEX "auction_tag_relations_auctionId_idx" ON "auction_tag_relations"("auctionId");

-- CreateIndex
CREATE INDEX "auction_tag_relations_tagId_idx" ON "auction_tag_relations"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_fees_uuid_key" ON "auction_fees"("uuid");

-- CreateIndex
CREATE INDEX "auction_fees_auctionId_idx" ON "auction_fees"("auctionId");

-- CreateIndex
CREATE INDEX "auction_fees_feeType_idx" ON "auction_fees"("feeType");

-- CreateIndex
CREATE INDEX "auctions_categoryId_idx" ON "auctions"("categoryId");

-- CreateIndex
CREATE INDEX "auctions_subCategoryId_idx" ON "auctions"("subCategoryId");

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_tag_relations" ADD CONSTRAINT "auction_tag_relations_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_tag_relations" ADD CONSTRAINT "auction_tag_relations_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "auction_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_fees" ADD CONSTRAINT "auction_fees_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
