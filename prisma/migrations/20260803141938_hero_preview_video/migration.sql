-- AlterTable
ALTER TABLE "instructors" ADD COLUMN     "heroPosterAssetId" TEXT,
ADD COLUMN     "heroVideoAssetId" TEXT,
ADD COLUMN     "heroVideoFilename" TEXT,
ADD COLUMN     "heroVideoProvider" TEXT,
ADD COLUMN     "heroVideoStatus" "VideoStatus",
ADD COLUMN     "heroVideoStorageKey" TEXT;

-- AddForeignKey
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_heroPosterAssetId_fkey" FOREIGN KEY ("heroPosterAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
