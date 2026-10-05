-- Backfill: existing lots without a schedule inherit their auction's window
UPDATE "auction_items" AS ai
SET "scheduledStartAt" = COALESCE(ai."scheduledStartAt", a."startTime"),
    "scheduledEndAt"   = COALESCE(ai."scheduledEndAt", a."endTime")
FROM "auctions" AS a
WHERE a."id" = ai."auctionId"
  AND (ai."scheduledStartAt" IS NULL OR ai."scheduledEndAt" IS NULL);

-- Clamp any existing lot schedule that falls outside its auction's window
UPDATE "auction_items" AS ai
SET "scheduledStartAt" = GREATEST(LEAST(ai."scheduledStartAt", a."endTime"), a."startTime"),
    "scheduledEndAt"   = LEAST(GREATEST(ai."scheduledEndAt", a."startTime"), a."endTime")
FROM "auctions" AS a
WHERE a."id" = ai."auctionId"
  AND (ai."scheduledStartAt" < a."startTime" OR ai."scheduledEndAt" > a."endTime");

-- A lot whose end isn't after its start gets the full auction window
UPDATE "auction_items" AS ai
SET "scheduledStartAt" = a."startTime",
    "scheduledEndAt"   = a."endTime"
FROM "auctions" AS a
WHERE a."id" = ai."auctionId"
  AND ai."scheduledEndAt" <= ai."scheduledStartAt";

-- AlterTable
ALTER TABLE "auction_items" ALTER COLUMN "scheduledStartAt" SET NOT NULL,
ALTER COLUMN "scheduledEndAt" SET NOT NULL;

-- Lot must end after it starts (not expressible in schema.prisma)
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_schedule_window_check"
CHECK ("scheduledEndAt" > "scheduledStartAt");

-- CreateIndex
CREATE INDEX "auction_items_scheduledStartAt_idx" ON "auction_items"("scheduledStartAt");

-- CreateIndex
CREATE INDEX "auction_items_scheduledEndAt_idx" ON "auction_items"("scheduledEndAt");
