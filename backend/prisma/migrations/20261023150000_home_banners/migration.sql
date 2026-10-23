-- CreateTable
CREATE TABLE "home_banners" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageKey" TEXT,
    "altText" VARCHAR(200),
    "linkUrl" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_banners_uuid_key" ON "home_banners"("uuid");

-- CreateIndex
CREATE INDEX "home_banners_isActive_sortOrder_idx" ON "home_banners"("isActive", "sortOrder");
