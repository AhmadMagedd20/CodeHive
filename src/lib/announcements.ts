import type { Announcement, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { announcementEmail } from "./email/templates";

/**
 * Announcement visibility + delivery. An announcement is "live" to a student
 * once `sentAt` is set (immediate = set on creation; scheduled = set by cron).
 * A student sees GLOBAL announcements plus COURSE announcements for courses they
 * have access to.
 */

/** Course ids a student can see announcements for. */
async function accessibleCourseIds(studentId: string): Promise<string[]> {
  const rows = await prisma.studentCourseAccess.findMany({
    where: { studentId },
    select: { courseId: true },
  });
  return rows.map((r) => r.courseId);
}

/** `where` clause for announcements visible to a student. */
export async function visibleAnnouncementsWhere(
  studentId: string,
): Promise<Prisma.AnnouncementWhereInput> {
  const courseIds = await accessibleCourseIds(studentId);
  return {
    sentAt: { not: null },
    OR: [{ scope: "GLOBAL" }, { scope: "COURSE", courseId: { in: courseIds } }],
  };
}

export async function countUnreadAnnouncements(studentId: string): Promise<number> {
  const where = await visibleAnnouncementsWhere(studentId);
  return prisma.announcement.count({
    where: { ...where, reads: { none: { studentId } } },
  });
}

/**
 * Resolve the recipients for an announcement: ACTIVE students, either all (for
 * GLOBAL) or those with access to the course (for COURSE).
 */
export async function announcementRecipients(
  announcement: Pick<Announcement, "scope" | "courseId" | "instructorId">,
): Promise<{ id: string; email: string }[]> {
  if (announcement.scope === "GLOBAL") {
    return prisma.student.findMany({
      where: { instructorId: announcement.instructorId, state: "ACTIVE" },
      select: { id: true, email: true },
    });
  }
  if (!announcement.courseId) return [];
  return prisma.student.findMany({
    where: {
      state: "ACTIVE",
      courseAccess: { some: { courseId: announcement.courseId } },
    },
    select: { id: true, email: true },
  });
}

/** Send the notification emails for an announcement (best-effort, parallel). */
export async function sendAnnouncementEmails(announcement: Announcement): Promise<number> {
  const recipients = await announcementRecipients(announcement);
  const scopeLabel = announcement.scope === "GLOBAL" ? "Announcement · all cohorts" : "Course announcement";
  const preview = announcement.body.slice(0, 240) + (announcement.body.length > 240 ? "…" : "");
  await Promise.allSettled(
    recipients.map((r) => sendEmail(announcementEmail(r.email, announcement.title, preview, scopeLabel))),
  );
  return recipients.length;
}
