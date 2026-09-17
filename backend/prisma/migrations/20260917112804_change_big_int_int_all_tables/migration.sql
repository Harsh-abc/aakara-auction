/*
  Warnings:

  - The primary key for the `auction_documents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_documents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `itemId` on the `auction_documents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_extensions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_extensions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_extensions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `itemId` on the `auction_extensions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `triggeredByBidId` on the `auction_extensions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_fees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_fees` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_fees` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_images` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_images` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `itemId` on the `auction_images` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `categoryId` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `subCategoryId` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `currentBidderId` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `currencyId` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_participants` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_participants` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `userId` on the `auction_participants` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `approvedBy` on the `auction_participants` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_rules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_rules` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_rules` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_status_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_status_history` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_status_history` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `changedBy` on the `auction_status_history` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_tag_relations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `auctionId` on the `auction_tag_relations` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `tagId` on the `auction_tag_relations` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_tags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_tags` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auction_winners` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auction_winners` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `auctionId` on the `auction_winners` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `itemId` on the `auction_winners` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `winnerId` on the `auction_winners` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `winningBidId` on the `auction_winners` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auctions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auctions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `createdBy` on the `auctions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `categoryId` on the `auctions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `currencyId` on the `auctions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `subCategoryId` on the `auctions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `auto_bids` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auto_bids` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `itemId` on the `auto_bids` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `bidderId` on the `auto_bids` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `bids` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `bids` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `itemId` on the `bids` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `bidderId` on the `bids` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `currencies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `currencies` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `login_attempts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `login_attempts` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `userId` on the `login_attempts` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `permissions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `roleId` on the `role_permissions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `permissionId` on the `role_permissions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `sub_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `sub_categories` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `categoryId` on the `sub_categories` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `user_kyc` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_kyc` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `userId` on the `user_kyc` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `verifiedBy` on the `user_kyc` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `user_kyc_documents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_kyc_documents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `kycId` on the `user_kyc_documents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `verifiedBy` on the `user_kyc_documents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `user_kyc_verifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_kyc_verifications` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `kycId` on the `user_kyc_verifications` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `documentId` on the `user_kyc_verifications` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `performedBy` on the `user_kyc_verifications` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `user_profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `userId` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `user_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `userId` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `roleId` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- DropForeignKey
ALTER TABLE "auction_documents" DROP CONSTRAINT "auction_documents_itemId_fkey";

-- DropForeignKey
ALTER TABLE "auction_extensions" DROP CONSTRAINT "auction_extensions_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_extensions" DROP CONSTRAINT "auction_extensions_itemId_fkey";

-- DropForeignKey
ALTER TABLE "auction_extensions" DROP CONSTRAINT "auction_extensions_triggeredByBidId_fkey";

-- DropForeignKey
ALTER TABLE "auction_fees" DROP CONSTRAINT "auction_fees_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_images" DROP CONSTRAINT "auction_images_itemId_fkey";

-- DropForeignKey
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_currentBidderId_fkey";

-- DropForeignKey
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "auction_participants" DROP CONSTRAINT "auction_participants_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "auction_participants" DROP CONSTRAINT "auction_participants_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_participants" DROP CONSTRAINT "auction_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "auction_rules" DROP CONSTRAINT "auction_rules_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_status_history" DROP CONSTRAINT "auction_status_history_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_status_history" DROP CONSTRAINT "auction_status_history_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "auction_tag_relations" DROP CONSTRAINT "auction_tag_relations_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_tag_relations" DROP CONSTRAINT "auction_tag_relations_tagId_fkey";

-- DropForeignKey
ALTER TABLE "auction_winners" DROP CONSTRAINT "auction_winners_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "auction_winners" DROP CONSTRAINT "auction_winners_itemId_fkey";

-- DropForeignKey
ALTER TABLE "auction_winners" DROP CONSTRAINT "auction_winners_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "auction_winners" DROP CONSTRAINT "auction_winners_winningBidId_fkey";

-- DropForeignKey
ALTER TABLE "auctions" DROP CONSTRAINT "auctions_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "auctions" DROP CONSTRAINT "auctions_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "auctions" DROP CONSTRAINT "auctions_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "auctions" DROP CONSTRAINT "auctions_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "auto_bids" DROP CONSTRAINT "auto_bids_bidderId_fkey";

-- DropForeignKey
ALTER TABLE "auto_bids" DROP CONSTRAINT "auto_bids_itemId_fkey";

-- DropForeignKey
ALTER TABLE "bids" DROP CONSTRAINT "bids_bidderId_fkey";

-- DropForeignKey
ALTER TABLE "bids" DROP CONSTRAINT "bids_itemId_fkey";

-- DropForeignKey
ALTER TABLE "login_attempts" DROP CONSTRAINT "login_attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "sub_categories" DROP CONSTRAINT "sub_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc" DROP CONSTRAINT "user_kyc_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc" DROP CONSTRAINT "user_kyc_verifiedBy_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc_documents" DROP CONSTRAINT "user_kyc_documents_kycId_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc_documents" DROP CONSTRAINT "user_kyc_documents_verifiedBy_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc_verifications" DROP CONSTRAINT "user_kyc_verifications_documentId_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc_verifications" DROP CONSTRAINT "user_kyc_verifications_kycId_fkey";

-- DropForeignKey
ALTER TABLE "user_kyc_verifications" DROP CONSTRAINT "user_kyc_verifications_performedBy_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- AlterTable
ALTER TABLE "auction_documents" DROP CONSTRAINT "auction_documents_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "itemId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_documents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_extensions" DROP CONSTRAINT "auction_extensions_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ALTER COLUMN "itemId" SET DATA TYPE INTEGER,
ALTER COLUMN "triggeredByBidId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_extensions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_fees" DROP CONSTRAINT "auction_fees_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_fees_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_images" DROP CONSTRAINT "auction_images_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "itemId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_images_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_items" DROP CONSTRAINT "auction_items_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ALTER COLUMN "categoryId" SET DATA TYPE INTEGER,
ALTER COLUMN "subCategoryId" SET DATA TYPE INTEGER,
ALTER COLUMN "currentBidderId" SET DATA TYPE INTEGER,
ALTER COLUMN "currencyId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_participants" DROP CONSTRAINT "auction_participants_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ALTER COLUMN "userId" SET DATA TYPE INTEGER,
ALTER COLUMN "approvedBy" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_participants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_rules" DROP CONSTRAINT "auction_rules_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_rules_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_status_history" DROP CONSTRAINT "auction_status_history_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ALTER COLUMN "changedBy" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_status_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_tag_relations" DROP CONSTRAINT "auction_tag_relations_pkey",
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ALTER COLUMN "tagId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_tag_relations_pkey" PRIMARY KEY ("auctionId", "tagId");

-- AlterTable
ALTER TABLE "auction_tags" DROP CONSTRAINT "auction_tags_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ADD CONSTRAINT "auction_tags_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auction_winners" DROP CONSTRAINT "auction_winners_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "auctionId" SET DATA TYPE INTEGER,
ALTER COLUMN "itemId" SET DATA TYPE INTEGER,
ALTER COLUMN "winnerId" SET DATA TYPE INTEGER,
ALTER COLUMN "winningBidId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auction_winners_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auctions" DROP CONSTRAINT "auctions_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "createdBy" SET DATA TYPE INTEGER,
ALTER COLUMN "categoryId" SET DATA TYPE INTEGER,
ALTER COLUMN "currencyId" SET DATA TYPE INTEGER,
ALTER COLUMN "subCategoryId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auctions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auto_bids" DROP CONSTRAINT "auto_bids_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "itemId" SET DATA TYPE INTEGER,
ALTER COLUMN "bidderId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "auto_bids_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "bids" DROP CONSTRAINT "bids_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "itemId" SET DATA TYPE INTEGER,
ALTER COLUMN "bidderId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "currencies" DROP CONSTRAINT "currencies_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "login_attempts" DROP CONSTRAINT "login_attempts_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "userId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
ALTER COLUMN "roleId" SET DATA TYPE INTEGER,
ALTER COLUMN "permissionId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId");

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sub_categories" DROP CONSTRAINT "sub_categories_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "categoryId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_kyc" DROP CONSTRAINT "user_kyc_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "userId" SET DATA TYPE INTEGER,
ALTER COLUMN "verifiedBy" SET DATA TYPE INTEGER,
ADD CONSTRAINT "user_kyc_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_kyc_documents" DROP CONSTRAINT "user_kyc_documents_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "kycId" SET DATA TYPE INTEGER,
ALTER COLUMN "verifiedBy" SET DATA TYPE INTEGER,
ADD CONSTRAINT "user_kyc_documents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_kyc_verifications" DROP CONSTRAINT "user_kyc_verifications_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "kycId" SET DATA TYPE INTEGER,
ALTER COLUMN "documentId" SET DATA TYPE INTEGER,
ALTER COLUMN "performedBy" SET DATA TYPE INTEGER,
ADD CONSTRAINT "user_kyc_verifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "userId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "userId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" SET DATA TYPE SERIAL,
ALTER COLUMN "roleId" SET DATA TYPE INTEGER,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_documents" ADD CONSTRAINT "user_kyc_documents_kycId_fkey" FOREIGN KEY ("kycId") REFERENCES "user_kyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_documents" ADD CONSTRAINT "user_kyc_documents_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_verifications" ADD CONSTRAINT "user_kyc_verifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "user_kyc_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_verifications" ADD CONSTRAINT "user_kyc_verifications_kycId_fkey" FOREIGN KEY ("kycId") REFERENCES "user_kyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_verifications" ADD CONSTRAINT "user_kyc_verifications_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_tag_relations" ADD CONSTRAINT "auction_tag_relations_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_tag_relations" ADD CONSTRAINT "auction_tag_relations_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "auction_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_fees" ADD CONSTRAINT "auction_fees_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_currentBidderId_fkey" FOREIGN KEY ("currentBidderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_images" ADD CONSTRAINT "auction_images_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_documents" ADD CONSTRAINT "auction_documents_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_rules" ADD CONSTRAINT "auction_rules_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_status_history" ADD CONSTRAINT "auction_status_history_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_status_history" ADD CONSTRAINT "auction_status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_extensions" ADD CONSTRAINT "auction_extensions_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_extensions" ADD CONSTRAINT "auction_extensions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_extensions" ADD CONSTRAINT "auction_extensions_triggeredByBidId_fkey" FOREIGN KEY ("triggeredByBidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_winners" ADD CONSTRAINT "auction_winners_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_winners" ADD CONSTRAINT "auction_winners_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_winners" ADD CONSTRAINT "auction_winners_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_winners" ADD CONSTRAINT "auction_winners_winningBidId_fkey" FOREIGN KEY ("winningBidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_bids" ADD CONSTRAINT "auto_bids_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_bids" ADD CONSTRAINT "auto_bids_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
