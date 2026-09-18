-- AlterTable
ALTER TABLE "lesson_items" ADD COLUMN     "isExtra" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "student_course_access" ADD COLUMN     "extrasUnlocked" BOOLEAN NOT NULL DEFAULT false;
