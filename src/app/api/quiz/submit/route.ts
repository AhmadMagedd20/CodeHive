import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerIn = { questionId: string; response: number | boolean | string | null };

/**
 * Grades and submits a quiz attempt. MCQ/TRUE_FALSE are auto-graded; SHORT_ANSWER
 * is stored and flagged for manual grading. Returns per-question results with the
 * correct answers + explanations (post-submit reveal).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.kind !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const student = user.student;

  const { attemptId, answers } = (await req.json().catch(() => ({}))) as {
    attemptId?: string;
    answers?: AnswerIn[];
  };
  if (!attemptId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, studentId: student.id, status: "IN_PROGRESS" },
    include: { quiz: { include: { questions: { orderBy: { orderIndex: "asc" } } } } },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

  const byId = new Map(answers.map((a) => [a.questionId, a.response]));
  let score = 0;
  let maxScore = 0;
  let needsManual = false;

  const answerRows = attempt.quiz.questions.map((q) => {
    maxScore += q.points;
    const response = byId.get(q.id) ?? null;
    let isCorrect: boolean | null = null;
    let awardedPoints: number | null = null;
    let needsManualGrade = false;

    if (q.type === "MCQ") {
      isCorrect = typeof response === "number" && response === (q.correct as number);
      awardedPoints = isCorrect ? q.points : 0;
      score += awardedPoints;
    } else if (q.type === "TRUE_FALSE") {
      isCorrect = typeof response === "boolean" && response === (q.correct as boolean);
      awardedPoints = isCorrect ? q.points : 0;
      score += awardedPoints;
    } else {
      // SHORT_ANSWER — manual
      needsManualGrade = true;
      needsManual = true;
    }

    return {
      questionId: q.id,
      response: response ?? undefined,
      isCorrect,
      awardedPoints,
      needsManualGrade,
    };
  });

  await prisma.$transaction([
    prisma.quizAnswer.createMany({
      data: answerRows.map((r) => ({
        attemptId: attempt.id,
        questionId: r.questionId,
        response: r.response,
        isCorrect: r.isCorrect,
        awardedPoints: r.awardedPoints,
        needsManualGrade: r.needsManualGrade,
      })),
    }),
    prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: needsManual ? "SUBMITTED" : "GRADED",
        submittedAt: new Date(),
        score,
        maxScore,
        needsManualGrading: needsManual,
      },
    }),
    prisma.student.update({
      where: { id: student.id },
      data: { lastLearningActivityAt: new Date() },
    }),
    // Taking the quiz completes its lesson item (feeds course progress).
    prisma.lessonProgress.upsert({
      where: {
        studentId_lessonItemId: { studentId: student.id, lessonItemId: attempt.quiz.lessonItemId },
      },
      create: {
        studentId: student.id,
        lessonItemId: attempt.quiz.lessonItemId,
        status: "COMPLETED",
        completedAt: new Date(),
      },
      update: { status: "COMPLETED", completedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    score,
    maxScore,
    needsManual,
    results: attempt.quiz.questions.map((q) => ({
      questionId: q.id,
      correct: (q.correct as number | boolean | null) ?? null,
      explanation: q.explanation,
      isCorrect: answerRows.find((r) => r.questionId === q.id)?.isCorrect ?? null,
    })),
  });
}
