-- AlterTable
ALTER TABLE "auction_participants" ADD COLUMN "source" "LotBidderSource" NOT NULL DEFAULT 'SELF_REGISTERED';
