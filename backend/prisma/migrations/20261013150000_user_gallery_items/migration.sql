-- CreateTable
CREATE TABLE "user_gallery_items" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_gallery_items_userId_idx" ON "user_gallery_items"("userId");

-- CreateIndex
CREATE INDEX "user_gallery_items_itemId_idx" ON "user_gallery_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "user_gallery_items_userId_itemId_key" ON "user_gallery_items"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "user_gallery_items" ADD CONSTRAINT "user_gallery_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gallery_items" ADD CONSTRAINT "user_gallery_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
