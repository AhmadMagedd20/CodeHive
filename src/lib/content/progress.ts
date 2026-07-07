import { prisma } from "../prisma";
import { liveWhere } from "./visibility";

/**
 * Course completion = COMPLETED lesson-progress rows over the number of live
 * lesson items in the course. A lesson item is "completed" when the student
 * finishes a reading/doc, watches ≥90% of a video, or submits a quiz/assignment
 * (those flows upsert LessonProgress COMPLETED).
 */

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
}

/** Live lesson-item ids for a course (published or scheduled-past, in live modules). */
export async function liveItemIds(courseId: string): Promise<string[]> {
  const items = await prisma.lessonItem.findMany({
    where: { module: { courseId, ...liveWhere() }, ...liveWhere() },
    select: { id: true },
  });
  return items.map((i) => i.id);
}

export async function courseProgress(studentId: string, courseId: string): Promise<CourseProgress> {
  const ids = await liveItemIds(courseId);
  const total = ids.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = await prisma.lessonProgress.count({
    where: { studentId, status: "COMPLETED", lessonItemId: { in: ids } },
  });
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

/** Mark a lesson item completed for a student (idempotent). */
export async function markItemCompleted(studentId: string, lessonItemId: string): Promise<void> {
  await prisma.lessonProgress.upsert({
    where: { studentId_lessonItemId: { studentId, lessonItemId } },
    create: { studentId, lessonItemId, status: "COMPLETED", completedAt: new Date() },
    update: { status: "COMPLETED", completedAt: new Date() },
  });
}
