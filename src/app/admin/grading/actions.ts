"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";

/**
 * Grade one short-answer quiz answer. When an attempt's last manual answer is
 * graded, its score is recomputed and the attempt is marked GRADED.
 */
export async function gradeShortAnswer(formData: FormData) {
  const instructor = await requireInstructor();
  const answerId = String(formData.get("answerId"));
  const awardedRaw = parseInt(String(formData.get("awardedPoints") ?? "0"), 10);

  const answer = await prisma.quizAnswer.findFirst({
    where: {
      id: answerId,
      needsManualGrade: true,
      attempt: { quiz: { lessonItem: { module: { course: { instructorId: instructor.id } } } } },
    },
    include: { question: { select: { points: true } } },
  });
  if (!answer) return;

  const awarded = Math.max(0, Math.min(Number.isFinite(awardedRaw) ? awardedRaw : 0, answer.question.points));

  await prisma.quizAnswer.update({
    where: { id: answer.id },
    data: { awardedPoints: awarded, isCorrect: awarded > 0 },
  });

  const remaining = await prisma.quizAnswer.count({
    where: { attemptId: answer.attemptId, needsManualGrade: true, awardedPoints: null },
  });
  if (remaining === 0) {
    const all = await prisma.quizAnswer.findMany({ where: { attemptId: answer.attemptId } });
    const score = all.reduce((s, a) => s + (a.awardedPoints ?? 0), 0);
    await prisma.quizAttempt.update({
      where: { id: answer.attemptId },
      data: { score, status: "GRADED", needsManualGrading: false },
    });
  }

  revalidatePath("/admin/grading");
}

/**
 * Grade an assignment submission: Pass/Fail (gating signal), optional numeric
 * score (tracking only), individual feedback. Saving releases it to the
 * student immediately (releasedAt).
 */
export async function gradeSubmission(formData: FormData) {
  const instructor = await requireInstructor();
  const submissionId = String(formData.get("submissionId"));

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      assignment: { lessonItem: { module: { course: { instructorId: instructor.id } } } },
    },
  });
  if (!submission) return;

  const passed = String(formData.get("passed")) === "pass";
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const score = scoreRaw ? Math.max(0, parseInt(scoreRaw, 10) || 0) : null;
  const feedback = String(formData.get("feedback") ?? "").trim() || null;

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      passed,
      score,
      feedback,
      status: "GRADED",
      gradedAt: new Date(),
      gradedById: instructor.id,
      releasedAt: new Date(),
    },
  });

  revalidatePath("/admin/grading");
}

// --- Feedback snippets (reusable, then edited per submission) ---------------

export async function createSnippet(formData: FormData) {
  const instructor = await requireInstructor();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;
  await prisma.feedbackSnippet.create({ data: { instructorId: instructor.id, title, body } });
  revalidatePath("/admin/grading");
}

export async function deleteSnippet(formData: FormData) {
  const instructor = await requireInstructor();
  await prisma.feedbackSnippet.deleteMany({
    where: { id: String(formData.get("snippetId")), instructorId: instructor.id },
  });
  revalidatePath("/admin/grading");
}
