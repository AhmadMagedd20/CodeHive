import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendAnnouncementEmails } from "@/lib/announcements";
import { sendEmail } from "@/lib/email";
import { assignmentReminderEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled-jobs tick. A scheduler (Supabase pg_cron / Vercel Cron / external)
 * should POST here every few minutes with header `x-cron-secret: <CRON_SECRET>`.
 * Idempotent — safe to run repeatedly. Processes:
 *   1. scheduled announcements whose time has come,
 *   2. scheduled module/lesson publishes,
 *   3. ~24h-before due-date assignment reminders (deduped per student).
 */
export async function POST(req: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron disabled (CRON_SECRET unset)" }, { status: 503 });
  }
  if (req.headers.get("x-cron-secret") !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const summary = { announcementsSent: 0, modulesPublished: 0, itemsPublished: 0, remindersSent: 0 };

  // 1. Scheduled announcements.
  const dueAnnouncements = await prisma.announcement.findMany({
    where: { sentAt: null, publishAt: { not: null, lte: now } },
  });
  for (const a of dueAnnouncements) {
    await sendAnnouncementEmails(a);
    await prisma.announcement.update({ where: { id: a.id }, data: { sentAt: new Date() } });
    summary.announcementsSent++;
  }

  // 2. Scheduled publishes (flip the flag so visibility is consistent).
  const mods = await prisma.module.updateMany({
    where: { isPublished: false, publishAt: { not: null, lte: now } },
    data: { isPublished: true },
  });
  summary.modulesPublished = mods.count;
  const items = await prisma.lessonItem.updateMany({
    where: { isPublished: false, publishAt: { not: null, lte: now } },
    data: { isPublished: true },
  });
  summary.itemsPublished = items.count;

  // 3. Due-date reminders (~ASSIGNMENT_REMINDER_HOURS before due).
  const windowEnd = new Date(now.getTime() + env.ASSIGNMENT_REMINDER_HOURS * 3600 * 1000);
  const dueSoon = await prisma.assignment.findMany({
    where: { dueAt: { gt: now, lte: windowEnd } },
    include: {
      lessonItem: { select: { title: true, module: { select: { courseId: true } } } },
    },
  });
  for (const a of dueSoon) {
    const [students, already, passed] = await Promise.all([
      prisma.student.findMany({
        where: {
          state: "ACTIVE",
          courseAccess: { some: { courseId: a.lessonItem.module.courseId } },
        },
        select: { id: true, email: true },
      }),
      prisma.assignmentReminder.findMany({ where: { assignmentId: a.id }, select: { studentId: true } }),
      prisma.submission.findMany({ where: { assignmentId: a.id, passed: true }, select: { studentId: true } }),
    ]);
    const skip = new Set([...already.map((r) => r.studentId), ...passed.map((r) => r.studentId)]);
    for (const s of students) {
      if (skip.has(s.id)) continue;
      await sendEmail(assignmentReminderEmail(s.email, a.lessonItem.title, a.dueAt!));
      await prisma.assignmentReminder.create({ data: { assignmentId: a.id, studentId: s.id } });
      summary.remindersSent++;
    }
  }

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), ...summary });
}
