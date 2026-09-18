"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

/**
 * Toggle a course-level bookmark ("save this course") for the current student.
 * Idempotent per (student, course). Revalidates the surfaces that show saves.
 */
export async function toggleCourseBookmark(formData: FormData) {
  const student = await requireStudent();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return;

  const existing = await prisma.savedCourse.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.savedCourse.delete({ where: { id: existing.id } });
  } else {
    // Only allow saving a course the student can actually see (has access to or
    // is purchasable), scoped to their instructor.
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        instructorId: student.instructorId,
        OR: [{ isPurchasable: true }, { access: { some: { studentId: student.id } } }],
      },
      select: { id: true },
    });
    if (!course) return;
    await prisma.savedCourse.create({ data: { studentId: student.id, courseId } });
  }

  revalidatePath("/dashboard");
  revalidatePath("/catalog");
}
