-- AlterTable
ALTER TABLE "lesson_items" ADD COLUMN     "chapters" TEXT;

-- CreateTable
CREATE TABLE "saved_courses" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_courses_courseId_idx" ON "saved_courses"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_courses_studentId_courseId_key" ON "saved_courses"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "saved_courses" ADD CONSTRAINT "saved_courses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_courses" ADD CONSTRAINT "saved_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
