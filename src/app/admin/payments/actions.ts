"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { purchaseApprovedEmail, purchaseRejectedEmail } from "@/lib/email/templates";

async function ownedPurchase(instructorId: string, purchaseId: string) {
  return prisma.purchase.findFirst({
    where: { id: purchaseId, status: "PENDING", course: { instructorId } },
    include: {
      course: { select: { id: true, title: true } },
      module: { select: { id: true, title: true } },
      student: { select: { id: true, email: true } },
    },
  });
}

/** Human-readable scope, reused for the audit trail and the approval email. */
function scopeLabel(p: { course: { title: string }; module: { title: string } | null }): string {
  return p.module ? `${p.course.title} — ${p.module.title}` : p.course.title;
}

/**
 * Approve a payment → grant exactly what was bought.
 *
 * WHOLE_COURSE grants the course via the existing StudentCourseAccess mechanism
 * (the same grant the manual path uses). MODULE additionally writes a
 * StudentModuleAccess row and, for a brand-new grant, marks the course access
 * PER_MODULE so only bought weeks open. Idempotent on both grants.
 */
export async function approvePurchaseAction(formData: FormData) {
  const instructor = await requireInstructor();
  const purchase = await ownedPurchase(instructor.id, String(formData.get("purchaseId")));
  if (!purchase) return;

  const studentId = purchase.student.id;
  const courseId = purchase.course.id;
  const isModuleScope = purchase.scope === "MODULE" && purchase.module != null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.studentCourseAccess.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { accessMode: true },
    });

    if (isModuleScope) {
      // The course-level row is just the enrolment marker here; the week row
      // below is what actually opens content. Never downgrade someone who
      // already holds a fuller grant (whole-course buyer or in-person student).
      if (!existing) {
        await tx.studentCourseAccess.create({
          data: { studentId, courseId, accessMode: "PER_MODULE" },
        });
      }
      await tx.studentModuleAccess.upsert({
        where: { studentId_moduleId: { studentId, moduleId: purchase.module!.id } },
        update: {},
        create: { studentId, moduleId: purchase.module!.id },
      });
    } else {
      // Whole course. Unlock paid extras, and if they were previously on the
      // à-la-carte mode, promote them off it so every week (incl. ones added
      // later) opens. FULL/DRIP are left alone — that's in-person behaviour.
      await tx.studentCourseAccess.upsert({
        where: { studentId_courseId: { studentId, courseId } },
        update: {
          extrasUnlocked: true,
          ...(existing?.accessMode === "PER_MODULE" ? { accessMode: "GATED" as const } : {}),
        },
        create: { studentId, courseId, extrasUnlocked: true },
      });
    }

    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: instructor.id },
    });
  });

  await audit({
    event: "COURSE_ACCESS_GRANTED",
    success: true,
    studentId,
    message: `purchase: ${scopeLabel(purchase)}`,
  });
  await sendEmail(purchaseApprovedEmail(purchase.student.email, scopeLabel(purchase)));
  revalidatePath("/admin/payments");
}

export async function rejectPurchaseAction(formData: FormData) {
  const instructor = await requireInstructor();
  const purchase = await ownedPurchase(instructor.id, String(formData.get("purchaseId")));
  if (!purchase) return;

  const reason = String(formData.get("reason") ?? "").trim() || null;
  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date(), reviewedById: instructor.id },
  });
  await sendEmail(purchaseRejectedEmail(purchase.student.email, scopeLabel(purchase), reason ?? undefined));
  revalidatePath("/admin/payments");
}
