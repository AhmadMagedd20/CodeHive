-- CreateEnum
CREATE TYPE "PurchaseScope" AS ENUM ('WHOLE_COURSE', 'MODULE');

-- AlterEnum
ALTER TYPE "CourseAccessMode" ADD VALUE 'PER_MODULE';

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "salePriceCents" INTEGER;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "scope" "PurchaseScope" NOT NULL DEFAULT 'WHOLE_COURSE';

-- CreateTable
CREATE TABLE "student_module_access" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_module_access_moduleId_idx" ON "student_module_access"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "student_module_access_studentId_moduleId_key" ON "student_module_access"("studentId", "moduleId");

-- CreateIndex
CREATE INDEX "purchases_moduleId_idx" ON "purchases"("moduleId");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_module_access" ADD CONSTRAINT "student_module_access_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_module_access" ADD CONSTRAINT "student_module_access_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
