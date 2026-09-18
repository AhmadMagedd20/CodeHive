"use server";

import { revalidatePath } from "next/cache";
import type { LessonType, University } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { parsePriceToCents, deriveSalePricing } from "@/lib/money";

/**
 * Course-structure builder actions. Every action is scoped to the signed-in
 * instructor's own course (multi-tenant safe) and revalidates the builder page.
 */

function revalidate(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
}

function parseDateTime(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function ownedCourse(courseId: string) {
  const instructor = await requireInstructor();
  const course = await prisma.course.findFirst({ where: { id: courseId, instructorId: instructor.id } });
  if (!course) throw new Error("Course not found");
  return course;
}

async function ownedModule(moduleId: string) {
  const instructor = await requireInstructor();
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, course: { instructorId: instructor.id } },
  });
  if (!mod) throw new Error("Module not found");
  return mod;
}

async function ownedItem(itemId: string) {
  const instructor = await requireInstructor();
  const item = await prisma.lessonItem.findFirst({
    where: { id: itemId, module: { course: { instructorId: instructor.id } } },
    include: { module: true },
  });
  if (!item) throw new Error("Lesson item not found");
  return item;
}

// --- Course settings -------------------------------------------------------

export async function updateCourseSettings(formData: FormData) {
  const course = await ownedCourse(String(formData.get("courseId")));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const universityRaw = String(formData.get("university") ?? "");
  const university = (universityRaw === "GUC" || universityRaw === "GIU" ? universityRaw : null) as
    | University
    | null;
  const gatingEnabled = formData.get("gatingEnabled") === "on";
  const isPurchasable = formData.get("isPurchasable") === "on";
  const priceCents = parsePriceToCents(String(formData.get("price") ?? ""));
  const comingSoon = formData.get("comingSoon") === "on";
  if (!title) return;

  // The client submits an exact sale price (the source of truth) — either typed
  // directly or derived from a typed percentage. We store `salePriceCents`
  // exactly, plus a rounded `discountPercent` for badges/banner.
  const { salePriceCents, discountPercent } = deriveSalePricing(
    priceCents,
    parsePriceToCents(String(formData.get("salePrice") ?? "")),
  );

  await prisma.course.update({
    where: { id: course.id },
    data: {
      title,
      description,
      category,
      university,
      gatingEnabled,
      isPurchasable,
      priceCents: priceCents ?? null,
      discountPercent,
      salePriceCents,
      comingSoon,
    },
  });
  revalidate(course.id);
}

export async function toggleItemFreePreview(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  await prisma.lessonItem.update({
    where: { id: item.id },
    data: { isFreePreview: !item.isFreePreview },
  });
  revalidate(item.module.courseId);
}

/**
 * Mark a lesson as paid "extra" (lab/LeetCode/etc.). For in-person students,
 * extras are gated by a one-time payment instead of by attendance.
 */
export async function toggleItemExtra(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  await prisma.lessonItem.update({
    where: { id: item.id },
    data: { isExtra: !item.isExtra },
  });
  revalidate(item.module.courseId);
}

// --- Modules ---------------------------------------------------------------

export async function createModule(formData: FormData) {
  const course = await ownedCourse(String(formData.get("courseId")));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const count = await prisma.module.count({ where: { courseId: course.id } });
  await prisma.module.create({ data: { courseId: course.id, title, orderIndex: count } });
  revalidate(course.id);
}

export async function updateModule(formData: FormData) {
  const mod = await ownedModule(String(formData.get("moduleId")));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const publishAt = parseDateTime(formData.get("publishAt"));
  if (!title) return;

  // Prerequisite (gating): must be a different module in the same course.
  let prerequisiteModuleId: string | null = String(formData.get("prerequisiteModuleId") ?? "") || null;
  if (prerequisiteModuleId) {
    const prereq = await prisma.module.findFirst({
      where: { id: prerequisiteModuleId, courseId: mod.courseId, NOT: { id: mod.id } },
      select: { id: true },
    });
    if (!prereq) prerequisiteModuleId = null;
  }

  // Phase 5 — per-week price. Blank/zero clears it, making the week available
  // only as part of the full course.
  const rawPrice = parsePriceToCents(String(formData.get("price") ?? ""));
  const priceCents = rawPrice != null && rawPrice > 0 ? rawPrice : null;
  const { salePriceCents, discountPercent } = deriveSalePricing(
    priceCents,
    parsePriceToCents(String(formData.get("salePrice") ?? "")),
  );

  await prisma.module.update({
    where: { id: mod.id },
    data: {
      title,
      description,
      publishAt,
      prerequisiteModuleId,
      priceCents,
      salePriceCents,
      discountPercent,
    },
  });
  revalidate(mod.courseId);
}

export async function deleteModule(formData: FormData) {
  const mod = await ownedModule(String(formData.get("moduleId")));
  await prisma.module.delete({ where: { id: mod.id } });
  revalidate(mod.courseId);
}

export async function toggleModulePublish(formData: FormData) {
  const mod = await ownedModule(String(formData.get("moduleId")));
  await prisma.module.update({
    where: { id: mod.id },
    data: { isPublished: !mod.isPublished, publishAt: !mod.isPublished ? null : mod.publishAt },
  });
  revalidate(mod.courseId);
}

export async function moveModule(formData: FormData) {
  const mod = await ownedModule(String(formData.get("moduleId")));
  const dir = String(formData.get("dir"));
  const siblings = await prisma.module.findMany({
    where: { courseId: mod.courseId },
    orderBy: { orderIndex: "asc" },
  });
  const idx = siblings.findIndex((m) => m.id === mod.id);
  const swap = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swap) return;
  await prisma.$transaction([
    prisma.module.update({ where: { id: mod.id }, data: { orderIndex: swap.orderIndex } }),
    prisma.module.update({ where: { id: swap.id }, data: { orderIndex: mod.orderIndex } }),
  ]);
  revalidate(mod.courseId);
}

// --- Lesson items ----------------------------------------------------------

const LESSON_TYPES: LessonType[] = ["VIDEO", "DOCUMENT", "RICH_TEXT", "QUIZ", "ASSIGNMENT"];

export async function createItem(formData: FormData) {
  const mod = await ownedModule(String(formData.get("moduleId")));
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type")) as LessonType;
  if (!title || !LESSON_TYPES.includes(type)) return;
  const count = await prisma.lessonItem.count({ where: { moduleId: mod.id } });
  await prisma.lessonItem.create({
    data: {
      moduleId: mod.id,
      title,
      type,
      orderIndex: count,
      body: type === "RICH_TEXT" ? "" : null,
    },
  });
  revalidate(mod.courseId);
}

export async function updateItem(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  const title = String(formData.get("title") ?? "").trim();
  const publishAt = parseDateTime(formData.get("publishAt"));
  // Optional video chapters ("M:SS Label" per line) — only for VIDEO items.
  const chaptersRaw = formData.get("chapters");
  const chapters =
    item.type === "VIDEO" && chaptersRaw != null ? String(chaptersRaw).trim() || null : undefined;
  if (!title) return;
  await prisma.lessonItem.update({
    where: { id: item.id },
    data: { title, publishAt, ...(chapters !== undefined ? { chapters } : {}) },
  });
  revalidate(item.module.courseId);
}

export async function updateItemBody(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  if (item.type !== "RICH_TEXT") return;
  const body = String(formData.get("body") ?? "");
  await prisma.lessonItem.update({ where: { id: item.id }, data: { body } });
  revalidate(item.module.courseId);
}

export async function deleteItem(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  await prisma.lessonItem.delete({ where: { id: item.id } });
  revalidate(item.module.courseId);
}

export async function toggleItemPublish(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  await prisma.lessonItem.update({
    where: { id: item.id },
    data: { isPublished: !item.isPublished, publishAt: !item.isPublished ? null : item.publishAt },
  });
  revalidate(item.module.courseId);
}

export async function moveItem(formData: FormData) {
  const item = await ownedItem(String(formData.get("itemId")));
  const dir = String(formData.get("dir"));
  const siblings = await prisma.lessonItem.findMany({
    where: { moduleId: item.moduleId },
    orderBy: { orderIndex: "asc" },
  });
  const idx = siblings.findIndex((i) => i.id === item.id);
  const swap = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swap) return;
  await prisma.$transaction([
    prisma.lessonItem.update({ where: { id: item.id }, data: { orderIndex: swap.orderIndex } }),
    prisma.lessonItem.update({ where: { id: swap.id }, data: { orderIndex: item.orderIndex } }),
  ]);
  revalidate(item.module.courseId);
}
