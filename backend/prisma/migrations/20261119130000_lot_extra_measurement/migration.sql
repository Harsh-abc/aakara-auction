-- Free-text extra measurement shown after the size on the site ("22 × 30 in (56 × 76.5 cm) | <extra>")
ALTER TABLE "auction_item_dimensions" ADD COLUMN "extraMeasurement" TEXT;
