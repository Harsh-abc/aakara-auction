-- Special lots get an icon next to "Lot N" on the storefront
ALTER TABLE "auction_items" ADD COLUMN "isSpecial" BOOLEAN NOT NULL DEFAULT false;
