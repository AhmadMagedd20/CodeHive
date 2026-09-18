"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { revokeAllStudentSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { approvedEmail, courseAccessEmail } from "@/lib/email/templates";

/**
 * Admin (instructor) actions. Every one:
 *   - requires an authenticated instructor,
 *   - is scoped to that instructor's own students/courses (multi-tenant safe;
 *     never a global "the admin" shortcut),
 *   - writes an audit entry.
 */

async function ownStudent(instructorId: string, studentId: string) {
  return prisma.student.findFirst({ where: { id: studentId, instructorId } });
}

// `approveStudentAction` / `rejectStudentAction` used to live here. Manual
// approval was removed when email verification started activating accounts
// directly, leaving both unreachable — nothing rendered them and their own
// guards (`state !== "PENDING_ADMIN_APPROVAL"`) could never pass. Deleted.

export async function suspendStudentAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const student = await ownStudent(instructor.id, studentId);
  if (!student || student.state !== "ACTIVE") return;

  await prisma.student.update({ where: { id: student.id }, data: { state: "SUSPENDED" } });
  await revokeAllStudentSessions(student.id); // kick them out immediately
  await audit({ event: "ACCOUNT_SUSPENDED", success: true, studentId: student.id });
  revalidatePath("/admin/students");
}

export async function reactivateStudentAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const student = await ownStudent(instructor.id, studentId);
  if (!student || !["SUSPENDED", "DEACTIVATED", "REJECTED"].includes(student.state)) return;

  await prisma.student.update({
    where: { id: student.id },
    data: { state: "ACTIVE", rejectionReason: null },
  });
  await audit({ event: "ACCOUNT_REACTIVATED", success: true, studentId: student.id });
  await sendEmail(approvedEmail(student.email));
  revalidatePath("/admin/students");
}

export async function grantCourseAccessAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const courseIds = formData.getAll("courseId").map(String).filter(Boolean);
  const student = await ownStudent(instructor.id, studentId);
  if (!student || courseIds.length === 0) return;

  // Only this instructor's courses that aren't already granted.
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds }, instructorId: instructor.id },
  });
  const existing = await prisma.studentCourseAccess.findMany({
    where: { studentId: student.id, courseId: { in: courses.map((c) => c.id) } },
    select: { courseId: true },
  });
  const existingIds = new Set(existing.map((e) => e.courseId));
  const toAdd = courses.filter((c) => !existingIds.has(c.id));
  if (toAdd.length === 0) return;

  await prisma.studentCourseAccess.createMany({
    data: toAdd.map((c) => ({ studentId: student.id, courseId: c.id })),
    skipDuplicates: true,
  });
  await audit({
    event: "COURSE_ACCESS_GRANTED",
    success: true,
    studentId: student.id,
    message: toAdd.map((c) => c.title).join(", "),
  });
  await sendEmail(courseAccessEmail(student.email, toAdd.map((c) => c.title)));
  revalidatePath("/admin/students");
}

export async function revokeCourseAccessAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const courseId = String(formData.get("courseId"));
  const student = await ownStudent(instructor.id, studentId);
  if (!student) return;

  await prisma.studentCourseAccess.deleteMany({
    where: { studentId: student.id, courseId, course: { instructorId: instructor.id } },
  });
  await audit({
    event: "COURSE_ACCESS_REVOKED",
    success: true,
    studentId: student.id,
    message: courseId,
  });
  revalidatePath("/admin/students");
}

/**
 * Manual gating override: unlock one module for one student without changing
 * the course-wide rule (makeup work / edge cases).
 */
export async function grantModuleUnlockAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const moduleId = String(formData.get("moduleId"));
  const student = await ownStudent(instructor.id, studentId);
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, course: { instructorId: instructor.id } },
  });
  if (!student || !mod) return;

  await prisma.studentModuleUnlock.upsert({
    where: { studentId_moduleId: { studentId: student.id, moduleId: mod.id } },
    update: {},
    create: { studentId: student.id, moduleId: mod.id, grantedById: instructor.id },
  });
  revalidatePath("/admin/students");
}

export async function revokeModuleUnlockAction(formData: FormData) {
  const instructor = await requireInstructor();
  await prisma.studentModuleUnlock.deleteMany({
    where: {
      id: String(formData.get("unlockId")),
      module: { course: { instructorId: instructor.id } },
    },
  });
  revalidatePath("/admin/students");
}

export async function createCourseAction(formData: FormData) {
  const instructor = await requireInstructor();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;

  await prisma.course.create({ data: { title, description, instructorId: instructor.id } });
  revalidatePath("/admin/courses");
  revalidatePath("/admin/students");
}
