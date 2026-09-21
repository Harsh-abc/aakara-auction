/*
  Warnings:

  - You are about to drop the column `dimensions` on the `auction_items` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DIMENSIONUNIT" AS ENUM ('CM', 'INCH', 'MM', 'METER', 'FEET');

-- CreateEnum
CREATE TYPE "WEIGHTUNIT" AS ENUM ('KG', 'GRAM', 'LB', 'OZ');

-- AlterTable
ALTER TABLE "auction_items" DROP COLUMN "dimensions";

-- CreateTable
CREATE TABLE "auction_item_dimensions" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "auctionItemId" BIGINT NOT NULL,
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "depth" DECIMAL(10,2),
    "dimensionUnit" "DIMENSIONUNIT" NOT NULL DEFAULT 'CM',
    "weight" DECIMAL(10,2),
    "weightUnit" "WEIGHTUNIT",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_item_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auction_item_dimensions_uuid_key" ON "auction_item_dimensions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "auction_item_dimensions_auctionItemId_key" ON "auction_item_dimensions"("auctionItemId");

-- AddForeignKey
ALTER TABLE "auction_item_dimensions" ADD CONSTRAINT "auction_item_dimensions_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
