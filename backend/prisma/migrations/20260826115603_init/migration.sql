-- CreateEnum
CREATE TYPE "AuctionType" AS ENUM ('LIVE', 'FLOOR', 'HYBRID');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PREVIEW', 'LIVE', 'PAUSED', 'ENDED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'SOLD', 'UNSOLD', 'PASSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AuctionDocumentType" AS ENUM ('CERTIFICATE_OF_AUTHENTICITY', 'PROVENANCE', 'APPRAISAL', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('BID_INCREMENT', 'BUYER_PREMIUM', 'EXTENSION_TRIGGER', 'REGISTRATION_DEPOSIT', 'MIN_PARTICIPANTS');

-- CreateEnum
CREATE TYPE "RuleValueType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BANNED');

-- CreateEnum
CREATE TYPE "WinnerPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PLACED', 'WINNING', 'OUTBID', 'WON', 'LOST', 'CANCELLED', 'RETRACTED');

-- CreateEnum
CREATE TYPE "BidSource" AS ENUM ('MANUAL', 'PROXY');

-- CreateTable
CREATE TABLE "categories" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_categories" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "auctionType" "AuctionType" NOT NULL DEFAULT 'FLOOR',
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "previewStartAt" TIMESTAMP(3),
    "registrationRequired" BOOLEAN NOT NULL DEFAULT true,
    "registrationDeadline" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "venue" TEXT,
    "termsAndConditions" TEXT,
    "createdBy" BIGINT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_items" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "subCategoryId" BIGINT,
    "itemNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "artistName" TEXT,
    "medium" TEXT,
    "dimensions" TEXT,
    "yearCreated" TEXT,
    "provenance" TEXT,
    "conditionReport" TEXT,
    "startingPrice" DECIMAL(12,2) NOT NULL,
    "reservePrice" DECIMAL(12,2),
    "estimateLow" DECIMAL(12,2),
    "estimateHigh" DECIMAL(12,2),
    "currentBid" DECIMAL(12,2),
    "currentBidderId" BIGINT,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ItemStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledStartAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "shippingInfo" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_images" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_documents" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "documentType" "AuctionDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_rules" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "valueType" "RuleValueType" NOT NULL DEFAULT 'FIXED',
    "rangeMin" DECIMAL(12,2),
    "rangeMax" DECIMAL(12,2),
    "value" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_participants" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "paddleNumber" TEXT,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" BIGINT,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(12,2),
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_status_history" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "fromStatus" "AuctionStatus",
    "toStatus" "AuctionStatus" NOT NULL,
    "changedBy" BIGINT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_extensions" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "originalEndTime" TIMESTAMP(3) NOT NULL,
    "extendedEndTime" TIMESTAMP(3) NOT NULL,
    "extensionSeconds" INTEGER NOT NULL,
    "triggeredByBidId" BIGINT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_winners" (
    "id" BIGSERIAL NOT NULL,
    "auctionId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "winnerId" BIGINT NOT NULL,
    "winningBidId" BIGINT,
    "finalHammerPrice" DECIMAL(12,2) NOT NULL,
    "buyerPremiumAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmountDue" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "WinnerPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDueAt" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "itemId" BIGINT NOT NULL,
    "bidderId" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" "BidSource" NOT NULL DEFAULT 'MANUAL',
    "status" "BidStatus" NOT NULL DEFAULT 'PLACED',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_bids" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "bidderId" BIGINT NOT NULL,
    "maxAmount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_uuid_key" ON "categories"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sub_categories_uuid_key" ON "sub_categories"("uuid");

-- CreateIndex
CREATE INDEX "sub_categories_categoryId_idx" ON "sub_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "sub_categories_categoryId_slug_key" ON "sub_categories"("categoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_uuid_key" ON "auctions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_slug_key" ON "auctions"("slug");

-- CreateIndex
CREATE INDEX "auctions_status_idx" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "auctions_startTime_idx" ON "auctions"("startTime");

-- CreateIndex
CREATE INDEX "auctions_endTime_idx" ON "auctions"("endTime");

-- CreateIndex
CREATE INDEX "auctions_createdBy_idx" ON "auctions"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "auction_items_uuid_key" ON "auction_items"("uuid");

-- CreateIndex
CREATE INDEX "auction_items_auctionId_idx" ON "auction_items"("auctionId");

-- CreateIndex
CREATE INDEX "auction_items_categoryId_idx" ON "auction_items"("categoryId");

-- CreateIndex
CREATE INDEX "auction_items_subCategoryId_idx" ON "auction_items"("subCategoryId");

-- CreateIndex
CREATE INDEX "auction_items_status_idx" ON "auction_items"("status");

-- CreateIndex
CREATE INDEX "auction_items_currentBidderId_idx" ON "auction_items"("currentBidderId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_items_auctionId_itemNumber_key" ON "auction_items"("auctionId", "itemNumber");

-- CreateIndex
CREATE INDEX "auction_images_itemId_idx" ON "auction_images"("itemId");

-- CreateIndex
CREATE INDEX "auction_documents_itemId_idx" ON "auction_documents"("itemId");

-- CreateIndex
CREATE INDEX "auction_rules_auctionId_idx" ON "auction_rules"("auctionId");

-- CreateIndex
CREATE INDEX "auction_rules_ruleType_idx" ON "auction_rules"("ruleType");

-- CreateIndex
CREATE INDEX "auction_participants_auctionId_idx" ON "auction_participants"("auctionId");

-- CreateIndex
CREATE INDEX "auction_participants_userId_idx" ON "auction_participants"("userId");

-- CreateIndex
CREATE INDEX "auction_participants_status_idx" ON "auction_participants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auction_participants_auctionId_userId_key" ON "auction_participants"("auctionId", "userId");

-- CreateIndex
CREATE INDEX "auction_status_history_auctionId_idx" ON "auction_status_history"("auctionId");

-- CreateIndex
CREATE INDEX "auction_status_history_createdAt_idx" ON "auction_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "auction_extensions_auctionId_idx" ON "auction_extensions"("auctionId");

-- CreateIndex
CREATE INDEX "auction_extensions_itemId_idx" ON "auction_extensions"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_winners_itemId_key" ON "auction_winners"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_winners_winningBidId_key" ON "auction_winners"("winningBidId");

-- CreateIndex
CREATE INDEX "auction_winners_auctionId_idx" ON "auction_winners"("auctionId");

-- CreateIndex
CREATE INDEX "auction_winners_winnerId_idx" ON "auction_winners"("winnerId");

-- CreateIndex
CREATE INDEX "auction_winners_paymentStatus_idx" ON "auction_winners"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "bids_uuid_key" ON "bids"("uuid");

-- CreateIndex
CREATE INDEX "bids_itemId_idx" ON "bids"("itemId");

-- CreateIndex
CREATE INDEX "bids_bidderId_idx" ON "bids"("bidderId");

-- CreateIndex
CREATE INDEX "bids_itemId_amount_idx" ON "bids"("itemId", "amount");

-- CreateIndex
CREATE INDEX "bids_status_idx" ON "bids"("status");

-- CreateIndex
CREATE INDEX "auto_bids_itemId_idx" ON "auto_bids"("itemId");

-- CreateIndex
CREATE INDEX "auto_bids_bidderId_idx" ON "auto_bids"("bidderId");

-- CreateIndex
CREATE UNIQUE INDEX "auto_bids_itemId_bidderId_key" ON "auto_bids"("itemId", "bidderId");

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_currentBidderId_fkey" FOREIGN KEY ("currentBidderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_images" ADD CONSTRAINT "auction_images_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_documents" ADD CONSTRAINT "auction_documents_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_rules" ADD CONSTRAINT "auction_rules_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "bids" ADD CONSTRAINT "bids_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_bids" ADD CONSTRAINT "auto_bids_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_bids" ADD CONSTRAINT "auto_bids_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
