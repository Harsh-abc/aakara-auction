-- Lots had their provenance typed into "Exhibition History". Move it to the
-- provenance column (appending to any provenance already there) and clear it.
UPDATE "auction_items"
SET "provenance" = CASE
        WHEN COALESCE(TRIM("provenance"), '') = '' THEN "exhibitionHistory"
        ELSE "provenance" || E'\n' || "exhibitionHistory"
    END,
    "exhibitionHistory" = NULL
WHERE COALESCE(TRIM("exhibitionHistory"), '') <> '';
