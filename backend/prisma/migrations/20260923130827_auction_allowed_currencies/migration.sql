-- CreateTable
CREATE TABLE "auction_currencies" (
    "auctionId" BIGINT NOT NULL,
    "currencyId" BIGINT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_currencies_pkey" PRIMARY KEY ("auctionId","currencyId")
);

-- CreateIndex
CREATE INDEX "auction_currencies_currencyId_idx" ON "auction_currencies"("currencyId");

-- AddForeignKey
ALTER TABLE "auction_currencies" ADD CONSTRAINT "auction_currencies_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_currencies" ADD CONSTRAINT "auction_currencies_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
