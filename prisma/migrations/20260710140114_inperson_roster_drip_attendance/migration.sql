-- CreateEnum
CREATE TYPE "CourseAccessMode" AS ENUM ('FULL', 'DRIP', 'GATED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ATTENDED', 'ABSENT');

-- AlterTable
ALTER TABLE "instructors" ADD COLUMN     "attendanceAutoRelease" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "effectivePriceCents" INTEGER,
ADD COLUMN     "inPersonDiscountApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "listPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "student_course_access" ADD COLUMN     "accessMode" "CourseAccessMode" NOT NULL DEFAULT 'GATED';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "isInPerson" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "roster_entries" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "code" TEXT NOT NULL,
    "codeExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_module_releases" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "releasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_module_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roster_entries_code_key" ON "roster_entries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roster_entries_studentId_key" ON "roster_entries"("studentId");

-- CreateIndex
CREATE INDEX "roster_entries_instructorId_idx" ON "roster_entries"("instructorId");

-- CreateIndex
CREATE INDEX "student_module_releases_moduleId_idx" ON "student_module_releases"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "student_module_releases_studentId_moduleId_key" ON "student_module_releases"("studentId", "moduleId");

-- CreateIndex
CREATE INDEX "attendance_records_courseId_idx" ON "attendance_records"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_studentId_courseId_week_key" ON "attendance_records"("studentId", "courseId", "week");

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_module_releases" ADD CONSTRAINT "student_module_releases_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_module_releases" ADD CONSTRAINT "student_module_releases_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_module_releases" ADD CONSTRAINT "student_module_releases_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
