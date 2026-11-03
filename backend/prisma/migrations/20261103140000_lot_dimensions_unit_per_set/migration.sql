-- Each of a lot's two size sets gets its own unit again (cm, mm, inch, m, ft).
-- The cm set becomes the primary set and the inch set the secondary one, so
-- saved sizes keep their values under the matching default units.

-- CreateEnum
CREATE TYPE "DIMENSIONUNIT" AS ENUM ('CM', 'INCH', 'MM', 'METER', 'FEET');

-- AlterTable
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "widthCm" TO "width";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "heightCm" TO "height";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "depthCm" TO "depth";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "widthIn" TO "secondaryWidth";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "heightIn" TO "secondaryHeight";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "depthIn" TO "secondaryDepth";

ALTER TABLE "auction_item_dimensions"
    ADD COLUMN "dimensionUnit" "DIMENSIONUNIT" NOT NULL DEFAULT 'CM',
    ADD COLUMN "secondaryDimensionUnit" "DIMENSIONUNIT" NOT NULL DEFAULT 'INCH';
