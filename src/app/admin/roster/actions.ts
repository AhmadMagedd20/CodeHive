"use server";

import { revalidatePath } from "next/cache";
import type { CourseAccessMode, AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { generateUniqueCode } from "@/lib/roster";
import { releaseModuleForStudent } from "@/lib/content/drip";
import { sendEmail } from "@/lib/email";
import { registrationCodeEmail } from "@/lib/email/templates";
import { audit } from "@/lib/audit";

/**
 * In-person roster, drip release, and attendance actions. Every action requires
 * an instructor and is scoped to that instructor's own roster/courses.
 */

const MODES: CourseAccessMode[] = ["FULL", "DRIP", "GATED"];

async function ownEntry(instructorId: string, entryId: string) {
  return prisma.rosterEntry.findFirst({ where: { id: entryId, instructorId } });
}
async function ownStudent(instructorId: string, studentId: string) {
  return prisma.student.findFirst({ where: { id: studentId, instructorId } });
}

// --- Roster + codes --------------------------------------------------------

export async function createRosterEntryAction(formData: FormData) {
  const instructor = await requireInstructor();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const expiryDays = parseInt(String(formData.get("expiryDays") ?? ""), 10);
  const emailCode = formData.get("emailCode") === "on";
  if (!name) return;

  const code = await generateUniqueCode();
  const codeExpiresAt =
    Number.isFinite(expiryDays) && expiryDays > 0
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : null;

  await prisma.rosterEntry.create({
    data: { instructorId: instructor.id, name, email, notes, code, codeExpiresAt },
  });

  if (emailCode && email) {
    await sendEmail(registrationCodeEmail(email, name, code));
  }
  revalidatePath("/admin/roster");
}

export async function revokeCodeAction(formData: FormData) {
  const instructor = await requireInstructor();
  const entry = await ownEntry(instructor.id, String(formData.get("entryId")));
  if (!entry || entry.usedAt || entry.studentId) return; // can't revoke a used code
  await prisma.rosterEntry.update({
    where: { id: entry.id },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/${entry.id}`);
}

export async function regenerateCodeAction(formData: FormData) {
  const instructor = await requireInstructor();
  const entry = await ownEntry(instructor.id, String(formData.get("entryId")));
  if (!entry || entry.usedAt || entry.studentId) return; // only unused codes
  const code = await generateUniqueCode();
  await prisma.rosterEntry.update({
    where: { id: entry.id },
    data: { code, revokedAt: null }, // fresh code, un-revoke
  });
  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/${entry.id}`);
}

export async function deleteRosterEntryAction(formData: FormData) {
  const instructor = await requireInstructor();
  const entry = await ownEntry(instructor.id, String(formData.get("entryId")));
  if (!entry || entry.studentId) return; // don't delete once an account is linked
  await prisma.rosterEntry.delete({ where: { id: entry.id } });
  revalidatePath("/admin/roster");
}

// --- Course access mode ----------------------------------------------------

/** Grant a course to a roster student with a chosen access mode. */
export async function grantWithModeAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const courseId = String(formData.get("courseId"));
  const mode = String(formData.get("mode")) as CourseAccessMode;
  const student = await ownStudent(instructor.id, studentId);
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: instructor.id },
  });
  if (!student || !course || !MODES.includes(mode)) return;

  await prisma.studentCourseAccess.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    update: { accessMode: mode },
    create: { studentId: student.id, courseId: course.id, accessMode: mode },
  });
  await audit({
    event: "COURSE_ACCESS_GRANTED",
    success: true,
    studentId: student.id,
    message: `${course.title} (${mode})`,
  });
  revalidatePath("/admin/roster");
  revalidatePathForStudent(student.id);
}

export async function setAccessModeAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const courseId = String(formData.get("courseId"));
  const mode = String(formData.get("mode")) as CourseAccessMode;
  if (!MODES.includes(mode)) return;
  const student = await ownStudent(instructor.id, studentId);
  if (!student) return;

  await prisma.studentCourseAccess.updateMany({
    where: { studentId, courseId, course: { instructorId: instructor.id } },
    data: { accessMode: mode },
  });
  revalidatePathForStudent(studentId);
}

// --- Drip releases ---------------------------------------------------------

export async function releaseModuleAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const moduleId = String(formData.get("moduleId"));
  const student = await ownStudent(instructor.id, studentId);
  if (!student) return;
  await releaseModuleForStudent({ studentId, moduleId, instructorId: instructor.id, notify: true });
  revalidatePathForStudent(studentId);
}

export async function unreleaseModuleAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const moduleId = String(formData.get("moduleId"));
  const student = await ownStudent(instructor.id, studentId);
  if (!student) return;
  await prisma.studentModuleRelease.deleteMany({
    where: { studentId, moduleId, module: { course: { instructorId: instructor.id } } },
  });
  revalidatePathForStudent(studentId);
}

/** Release the next not-yet-released module (by order) for a course. */
export async function releaseNextModuleAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const courseId = String(formData.get("courseId"));
  const student = await ownStudent(instructor.id, studentId);
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: instructor.id },
  });
  if (!student || !course) return;

  const [modules, released] = await Promise.all([
    prisma.module.findMany({ where: { courseId }, orderBy: { orderIndex: "asc" }, select: { id: true } }),
    prisma.studentModuleRelease.findMany({ where: { studentId, module: { courseId } }, select: { moduleId: true } }),
  ]);
  const releasedSet = new Set(released.map((r) => r.moduleId));
  const next = modules.find((m) => !releasedSet.has(m.id));
  if (!next) return;
  await releaseModuleForStudent({ studentId, moduleId: next.id, instructorId: instructor.id, notify: true });
  revalidatePathForStudent(studentId);
}

// --- Attendance ------------------------------------------------------------

export async function setAttendanceAction(formData: FormData) {
  const instructor = await requireInstructor();
  const studentId = String(formData.get("studentId"));
  const courseId = String(formData.get("courseId"));
  const week = parseInt(String(formData.get("week")), 10);
  const statusRaw = String(formData.get("status")); // ATTENDED | ABSENT | CLEAR
  const student = await ownStudent(instructor.id, studentId);
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: instructor.id },
  });
  if (!student || !course || !Number.isFinite(week) || week < 1) return;

  if (statusRaw === "CLEAR") {
    await prisma.attendanceRecord.deleteMany({ where: { studentId, courseId, week } });
    revalidatePath("/admin/attendance");
    revalidatePathForStudent(studentId);
    return;
  }
  const status = statusRaw as AttendanceStatus;
  if (status !== "ATTENDED" && status !== "ABSENT") return;

  await prisma.attendanceRecord.upsert({
    where: { studentId_courseId_week: { studentId, courseId, week } },
    update: { status, recordedById: instructor.id },
    create: { studentId, courseId, week, status, recordedById: instructor.id },
  });

  // Optional automation: attended week N → release the Nth module to a drip
  // student. Off unless the instructor enabled it AND the student is on DRIP.
  if (status === "ATTENDED" && instructor.attendanceAutoRelease) {
    const access = await prisma.studentCourseAccess.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { accessMode: true },
    });
    if (access?.accessMode === "DRIP") {
      const nth = await prisma.module.findMany({
        where: { courseId },
        orderBy: { orderIndex: "asc" },
        select: { id: true },
        skip: week - 1,
        take: 1,
      });
      if (nth[0]) {
        await releaseModuleForStudent({
          studentId,
          moduleId: nth[0].id,
          instructorId: instructor.id,
          notify: true,
        });
      }
    }
  }
  revalidatePath("/admin/attendance");
  revalidatePathForStudent(studentId);
}

export async function toggleAutoReleaseAction() {
  const instructor = await requireInstructor();
  await prisma.instructor.update({
    where: { id: instructor.id },
    data: { attendanceAutoRelease: !instructor.attendanceAutoRelease },
  });
  revalidatePath("/admin/attendance");
}

function revalidatePathForStudent(studentId: string) {
  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/student/${studentId}`);
}
