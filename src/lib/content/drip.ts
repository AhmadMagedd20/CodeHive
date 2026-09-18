import { prisma } from "../prisma";
import { sendEmail } from "../email";
import { lectureReleasedEmail } from "../email/templates";

/**
 * Release one module ("lecture") to one student in DRIP mode. Idempotent —
 * re-releasing an already-released module is a no-op (and sends no email).
 * Scoped to the instructor's own course. Optionally emails the student.
 */
export async function releaseModuleForStudent(opts: {
  studentId: string;
  moduleId: string;
  instructorId: string;
  notify?: boolean;
}): Promise<{ created: boolean }> {
  const mod = await prisma.module.findFirst({
    where: { id: opts.moduleId, course: { instructorId: opts.instructorId } },
    include: { course: { select: { title: true } } },
  });
  if (!mod) return { created: false };

  const existing = await prisma.studentModuleRelease.findUnique({
    where: { studentId_moduleId: { studentId: opts.studentId, moduleId: opts.moduleId } },
    select: { id: true },
  });
  if (existing) return { created: false };

  await prisma.studentModuleRelease.create({
    data: { studentId: opts.studentId, moduleId: opts.moduleId, releasedById: opts.instructorId },
  });

  if (opts.notify) {
    const student = await prisma.student.findUnique({
      where: { id: opts.studentId },
      select: { email: true },
    });
    if (student) await sendEmail(lectureReleasedEmail(student.email, mod.course.title, mod.title));
  }
  return { created: true };
}
