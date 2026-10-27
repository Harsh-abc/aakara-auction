-- AlterTable
ALTER TABLE "users" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedIp" VARCHAR(64),
ADD COLUMN     "termsAcceptedUserAgent" VARCHAR(500),
ADD COLUMN     "termsVersion" VARCHAR(32);
