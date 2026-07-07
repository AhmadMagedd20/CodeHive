import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isLive } from "@/lib/content/visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts a quiz attempt (enforces window + attempt limit). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.kind !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const student = user.student;

  const { quizId } = (await req.json().catch(() => ({}))) as { quizId?: string };
  if (!quizId) return NextResponse.json({ error: "Missing quizId" }, { status: 400 });

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { lessonItem: { include: { module: true } } },
  });
  if (!quiz || !isLive(quiz.lessonItem) || !isLive(quiz.lessonItem.module)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await prisma.studentCourseAccess.findUnique({
    where: {
      studentId_courseId: { studentId: student.id, courseId: quiz.lessonItem.module.courseId },
    },
  });
  if (!access) return NextResponse.json({ error: "No access" }, { status: 403 });

  const now = new Date();
  if (quiz.opensAt && now < quiz.opensAt) {
    return NextResponse.json({ error: "This quiz isn't open yet." }, { status: 403 });
  }
  if (quiz.closesAt && now > quiz.closesAt) {
    return NextResponse.json({ error: "This quiz has closed." }, { status: 403 });
  }

  const count = await prisma.quizAttempt.count({ where: { quizId, studentId: student.id } });
  if (quiz.maxAttempts != null && count >= quiz.maxAttempts) {
    return NextResponse.json({ error: "No attempts remaining." }, { status: 403 });
  }

  const attempt = await prisma.quizAttempt.create({
    data: { quizId, studentId: student.id, attemptNo: count + 1, status: "IN_PROGRESS" },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    startedAt: attempt.startedAt.toISOString(),
    timeLimitMinutes: quiz.timeLimitMinutes,
  });
}
