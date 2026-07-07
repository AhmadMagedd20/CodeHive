"use server";

import { revalidatePath } from "next/cache";
import type { QuizQuestionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";

/**
 * Quiz builder actions (admin). Scoped to the instructor's own QUIZ lesson item.
 * Correct-answer encoding: MCQ -> option index (number); TRUE_FALSE -> boolean;
 * SHORT_ANSWER -> null (manual grading).
 */

function parseDT(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function ownedItem(itemId: string) {
  const instructor = await requireInstructor();
  const item = await prisma.lessonItem.findFirst({
    where: { id: itemId, type: "QUIZ", module: { course: { instructorId: instructor.id } } },
    include: { module: { select: { courseId: true } }, quiz: true },
  });
  if (!item) throw new Error("Quiz item not found");
  return item;
}

/** Ensure a Quiz row exists for the item; returns it. */
export async function ensureQuiz(itemId: string) {
  const item = await ownedItem(itemId);
  if (item.quiz) return item.quiz;
  return prisma.quiz.create({ data: { lessonItemId: item.id } });
}

async function ownedQuizByQuestion(questionId: string) {
  const instructor = await requireInstructor();
  const q = await prisma.quizQuestion.findFirst({
    where: { id: questionId, quiz: { lessonItem: { module: { course: { instructorId: instructor.id } } } } },
    include: { quiz: { include: { lessonItem: { include: { module: { select: { courseId: true } } } } } } },
  });
  if (!q) throw new Error("Question not found");
  return q;
}

function revalidate(itemId: string) {
  revalidatePath(`/admin/quiz/${itemId}`);
}

export async function updateQuizSettings(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  const quiz = item.quiz ?? (await prisma.quiz.create({ data: { lessonItemId: item.id } }));
  await prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      instructions: String(formData.get("instructions") ?? "").trim() || null,
      opensAt: parseDT(formData.get("opensAt")),
      closesAt: parseDT(formData.get("closesAt")),
      timeLimitMinutes: parseIntOrNull(formData.get("timeLimitMinutes")),
      maxAttempts: parseIntOrNull(formData.get("maxAttempts")),
    },
  });
  revalidate(item.id);
}

function readQuestionFields(formData: FormData) {
  const type = String(formData.get("type")) as QuizQuestionType;
  const prompt = String(formData.get("prompt") ?? "").trim();
  const points = Math.max(1, parseInt(String(formData.get("points") ?? "1"), 10) || 1);
  const explanation = String(formData.get("explanation") ?? "").trim() || null;

  let options: string[] | null = null;
  let correct: number | boolean | null = null;
  if (type === "MCQ") {
    options = formData.getAll("option").map(String).map((s) => s.trim()).filter(Boolean);
    correct = Number(formData.get("correctIndex") ?? 0);
    if (!Number.isFinite(correct) || (correct as number) < 0 || (correct as number) >= options.length) {
      correct = 0;
    }
  } else if (type === "TRUE_FALSE") {
    correct = formData.get("correctBool") === "true";
  }
  return { type, prompt, points, explanation, options, correct };
}

export async function addQuestion(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  const quiz = item.quiz ?? (await prisma.quiz.create({ data: { lessonItemId: item.id } }));
  const f = readQuestionFields(formData);
  if (!f.prompt) return;
  const count = await prisma.quizQuestion.count({ where: { quizId: quiz.id } });
  await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      orderIndex: count,
      type: f.type,
      prompt: f.prompt,
      points: f.points,
      explanation: f.explanation,
      options: f.options ?? undefined,
      correct: f.correct ?? undefined,
    },
  });
  revalidate(item.id);
}

export async function updateQuestion(formData: FormData) {
  const q = await ownedQuizByQuestion(String(formData.get("questionId")));
  const f = readQuestionFields(formData);
  if (!f.prompt) return;
  await prisma.quizQuestion.update({
    where: { id: q.id },
    data: {
      type: f.type,
      prompt: f.prompt,
      points: f.points,
      explanation: f.explanation,
      options: f.options ?? undefined,
      correct: f.correct ?? undefined,
    },
  });
  revalidate(q.quiz.lessonItem.id);
}

export async function deleteQuestion(formData: FormData) {
  const q = await ownedQuizByQuestion(String(formData.get("questionId")));
  await prisma.quizQuestion.delete({ where: { id: q.id } });
  revalidate(q.quiz.lessonItem.id);
}

export async function moveQuestion(formData: FormData) {
  const q = await ownedQuizByQuestion(String(formData.get("questionId")));
  const dir = String(formData.get("dir"));
  const siblings = await prisma.quizQuestion.findMany({
    where: { quizId: q.quizId },
    orderBy: { orderIndex: "asc" },
  });
  const idx = siblings.findIndex((s) => s.id === q.id);
  const swap = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swap) return;
  await prisma.$transaction([
    prisma.quizQuestion.update({ where: { id: q.id }, data: { orderIndex: swap.orderIndex } }),
    prisma.quizQuestion.update({ where: { id: swap.id }, data: { orderIndex: q.orderIndex } }),
  ]);
  revalidate(q.quiz.lessonItem.id);
}
