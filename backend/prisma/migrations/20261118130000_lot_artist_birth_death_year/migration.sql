-- Artist's birth / death year on a lot (free text, e.g. "1913", "c. 1920")
ALTER TABLE "auction_items" ADD COLUMN "artistBirthYear" TEXT;
ALTER TABLE "auction_items" ADD COLUMN "artistDeathYear" TEXT;
