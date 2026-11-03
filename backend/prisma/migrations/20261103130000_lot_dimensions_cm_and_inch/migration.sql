-- A lot's size is now kept in both cm and inches. The old width / height /
-- depth columns held one unit (dimensionUnit); they become the cm set, every
-- saved size is converted to cm, and the inch set is filled alongside.

-- AlterTable
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "width" TO "widthCm";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "height" TO "heightCm";
ALTER TABLE "auction_item_dimensions" RENAME COLUMN "depth" TO "depthCm";

ALTER TABLE "auction_item_dimensions"
    ADD COLUMN "widthIn" DECIMAL(10,2),
    ADD COLUMN "heightIn" DECIMAL(10,2),
    ADD COLUMN "depthIn" DECIMAL(10,2);

-- sizes entered in inches keep their exact inch values
UPDATE "auction_item_dimensions"
SET "widthIn" = "widthCm", "heightIn" = "heightCm", "depthIn" = "depthCm"
WHERE "dimensionUnit" = 'INCH';

-- every saved size to cm
UPDATE "auction_item_dimensions"
SET "widthCm"  = ROUND("widthCm"  * f.factor, 2),
    "heightCm" = ROUND("heightCm" * f.factor, 2),
    "depthCm"  = ROUND("depthCm"  * f.factor, 2)
FROM (VALUES ('INCH', 2.54), ('MM', 0.1), ('METER', 100), ('FEET', 30.48)) AS f(unit, factor)
WHERE "auction_item_dimensions"."dimensionUnit"::text = f.unit;

-- the inch set for sizes that weren't entered in inches
UPDATE "auction_item_dimensions"
SET "widthIn"  = ROUND("widthCm"  / 2.54, 2),
    "heightIn" = ROUND("heightCm" / 2.54, 2),
    "depthIn"  = ROUND("depthCm"  / 2.54, 2)
WHERE "dimensionUnit" <> 'INCH';

ALTER TABLE "auction_item_dimensions" DROP COLUMN "dimensionUnit";

-- DropEnum
DROP TYPE "DIMENSIONUNIT";
