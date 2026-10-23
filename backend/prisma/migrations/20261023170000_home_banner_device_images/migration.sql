-- AlterTable
ALTER TABLE "home_banners" ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "mobileImageHeight" INTEGER,
ADD COLUMN     "mobileImageKey" TEXT,
ADD COLUMN     "mobileImageUrl" TEXT,
ADD COLUMN     "mobileImageWidth" INTEGER,
ADD COLUMN     "tabletImageHeight" INTEGER,
ADD COLUMN     "tabletImageKey" TEXT,
ADD COLUMN     "tabletImageUrl" TEXT,
ADD COLUMN     "tabletImageWidth" INTEGER;
