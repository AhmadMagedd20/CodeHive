-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EGP',
ADD COLUMN     "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceCents" INTEGER;

-- AlterTable
ALTER TABLE "instructors" ADD COLUMN     "instapayHandle" TEXT,
ADD COLUMN     "instapayInstructions" TEXT,
ADD COLUMN     "instapayQrAssetId" TEXT;

-- AlterTable
ALTER TABLE "lesson_items" ADD COLUMN     "isFreePreview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "screenshotAssetId" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_studentId_idx" ON "purchases"("studentId");

-- CreateIndex
CREATE INDEX "purchases_courseId_idx" ON "purchases"("courseId");

-- CreateIndex
CREATE INDEX "purchases_status_idx" ON "purchases"("status");

-- AddForeignKey
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_instapayQrAssetId_fkey" FOREIGN KEY ("instapayQrAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_screenshotAssetId_fkey" FOREIGN KEY ("screenshotAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
