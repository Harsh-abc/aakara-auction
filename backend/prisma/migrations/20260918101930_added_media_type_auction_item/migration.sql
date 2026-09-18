/*
  Warnings:

  - Added the required column `mediaType` to the `auction_images` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MEDIATYPE" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "auction_images" ADD COLUMN     "mediaType" "MEDIATYPE" NOT NULL;
