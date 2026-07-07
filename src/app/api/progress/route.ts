import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isLive } from "@/lib/content/visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPLETE_THRESHOLD = 90; // % watched that counts a video as complete

/**
 * Records lesson progress: video position/watched-%, or an explicit completion
 * for readings/documents. Scoped to a student with access to a live item.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.kind !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = user.student;

  const body = (await req.json().catch(() => ({}))) as {
    lessonItemId?: string;
    positionSeconds?: number;
    watchedPercent?: number;
    completed?: boolean;
  };
  if (!body.lessonItemId) return NextResponse.json({ error: "Missing lessonItemId" }, { status: 400 });

  const item = await prisma.lessonItem.findUnique({
    where: { id: body.lessonItemId },
    include: { module: { include: { course: { select: { id: true } } } } },
  });
  if (!item || !isLive(item) || !isLive(item.module)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await prisma.studentCourseAccess.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId: item.module.courseId } },
  });
  if (!access) return NextResponse.json({ error: "No access" }, { status: 403 });

  const existing = await prisma.lessonProgress.findUnique({
    where: { studentId_lessonItemId: { studentId: student.id, lessonItemId: item.id } },
  });

  const watchedPercent = Math.min(
    100,
    Math.max(existing?.watchedPercent ?? 0, Math.round(body.watchedPercent ?? 0)),
  );
  const completed = body.completed || watchedPercent >= COMPLETE_THRESHOLD;
  const lastPositionSeconds =
    body.positionSeconds != null ? Math.max(0, Math.round(body.positionSeconds)) : existing?.lastPositionSeconds ?? 0;

  const data = {
    watchedPercent,
    lastPositionSeconds,
    status: completed ? ("COMPLETED" as const) : ("IN_PROGRESS" as const),
    completedAt: completed ? existing?.completedAt ?? new Date() : null,
  };

  await prisma.$transaction([
    prisma.lessonProgress.upsert({
      where: { studentId_lessonItemId: { studentId: student.id, lessonItemId: item.id } },
      create: { studentId: student.id, lessonItemId: item.id, ...data },
      update: data,
    }),
    prisma.student.update({
      where: { id: student.id },
      data: { lastLearningActivityAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, watchedPercent, status: data.status });
}
