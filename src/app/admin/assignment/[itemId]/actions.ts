"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";

/** Assignment settings (admin). Scoped to the instructor's own ASSIGNMENT item. */
export async function updateAssignmentSettings(formData: FormData) {
  const instructor = await requireInstructor();
  const itemId = String(formData.get("itemId"));

  const item = await prisma.lessonItem.findFirst({
    where: { id: itemId, type: "ASSIGNMENT", module: { course: { instructorId: instructor.id } } },
    include: { assignment: true },
  });
  if (!item) throw new Error("Assignment item not found");

  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const dueRaw = String(formData.get("dueAt") ?? "").trim();
  const dueAt = dueRaw ? new Date(dueRaw) : null;
  const isGating = formData.get("isGating") === "on";
  const submissionModeRaw = String(formData.get("submissionMode"));
  const submissionMode = submissionModeRaw === "CODE" ? "CODE" : "FILE";
  const codeLanguage = String(formData.get("codeLanguage") ?? "").trim() || null;

  const data = {
    instructions,
    dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    isGating,
    submissionMode,
    codeLanguage: submissionMode === "CODE" ? codeLanguage : null,
  } as const;

  if (item.assignment) {
    await prisma.assignment.update({ where: { id: item.assignment.id }, data });
  } else {
    await prisma.assignment.create({ data: { lessonItemId: item.id, ...data } });
  }

  revalidatePath(`/admin/assignment/${item.id}`);
}
