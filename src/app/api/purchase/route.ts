import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { storage, makeStorageKey } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { purchaseSubmittedEmail } from "@/lib/email/templates";
import { sendTelegramMessage } from "@/lib/telegram";
import { purchaseSubmittedMessage } from "@/lib/telegram/templates";
import { priceBreakdown, isModulePurchasable } from "@/lib/money";
import { quoteCourseUpgrade } from "@/lib/upgrade-credit";
import { canUnlockExtras, getCourseOwnership } from "@/lib/content/access";
import { liveWhere } from "@/lib/content/visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Submit a purchase: student uploads a screenshot of their InstaPay transfer.
 * Creates a PENDING Purchase (price snapshotted). Guards: course must be
 * purchasable, student must not already have access, and only one PENDING
 * purchase per student+course at a time.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.kind !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const student = user.student;

  const form = await req.formData();
  const courseId = String(form.get("courseId") ?? "");
  const moduleId = String(form.get("moduleId") ?? "").trim() || null;
  const file = form.get("screenshot");
  if (!courseId) return NextResponse.json({ error: "Missing course" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Attach a screenshot of your transfer" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "The screenshot must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 10 MB" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, isPurchasable: true, priceCents: { not: null } },
    select: {
      id: true,
      title: true,
      priceCents: true,
      currency: true,
      discountPercent: true,
      salePriceCents: true,
      comingSoon: true,
    },
  });
  if (!course || course.priceCents == null) {
    return NextResponse.json({ error: "This course isn't for sale" }, { status: 404 });
  }
  if (course.comingSoon) {
    return NextResponse.json({ error: "This course isn't open for enrollment yet" }, { status: 409 });
  }
  // Phase 5 — a week-scoped purchase. Re-validated here (never trusting the
  // client): the week must belong to this course, be live, and carry a price.
  const mod = moduleId
    ? await prisma.module.findFirst({
        where: { id: moduleId, courseId: course.id, ...liveWhere() },
      })
    : null;
  if (moduleId && (!mod || !isModulePurchasable(mod))) {
    return NextResponse.json({ error: "That week isn't sold separately" }, { status: 404 });
  }

  // Snapshot the full breakdown for the CHOSEN SCOPE. In-person accounts get the
  // private 40% off the current effective (sale) price automatically — the same
  // stacking rule at week level as at course level.
  // Whole-course purchases credit what the student already paid for approved
  // single weeks in this course, so they never buy the same content twice.
  const upgrade = mod
    ? null
    : await quoteCourseUpgrade({
        studentId: student.id,
        courseId: course.id,
        priceCents: course.priceCents,
        discountPercent: course.discountPercent,
        salePriceCents: course.salePriceCents,
        isInPerson: student.isInPerson,
      });
  const price = mod
    ? priceBreakdown(mod.priceCents!, mod.discountPercent, mod.salePriceCents, student.isInPerson)
    : upgrade!;
  const amountDueCents = mod ? price.finalCents : upgrade!.dueCents;

  const [access, ownership, pending] = await Promise.all([
    prisma.studentCourseAccess.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    }),
    getCourseOwnership(student.id, course.id),
    prisma.purchase.findFirst({
      where: {
        studentId: student.id,
        courseId: course.id,
        status: "PENDING",
        ...(mod ? { moduleId: mod.id } : { scope: "WHOLE_COURSE" }),
      },
      select: { id: true },
    }),
  ]);

  if (mod) {
    if (ownership.wholeCourse) {
      return NextResponse.json({ error: "You already have access to this course" }, { status: 400 });
    }
    if (ownership.ownedModuleIds.has(mod.id)) {
      return NextResponse.json({ error: "You already own this week" }, { status: 400 });
    }
  } else if (ownership.wholeCourse && !canUnlockExtras(student.isInPerson, access)) {
    // Only a genuine whole-course owner has nothing left to buy — a PER_MODULE
    // student holds an access row purely as an enrolment marker and must still
    // be able to upgrade. In-person DRIP students may also still buy extras.
    return NextResponse.json({ error: "You already have access to this course" }, { status: 400 });
  }
  if (pending) {
    return NextResponse.json(
      {
        error: mod
          ? "You already have a payment under review for this week"
          : "You already have a payment under review for this course",
        pending: true,
      },
      { status: 409 },
    );
  }

  const key = makeStorageKey(`purchases/${course.id}`, file.name);
  await storage.put(key, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  const asset = await prisma.fileAsset.create({
    data: {
      provider: storage.name,
      storageKey: key,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  try {
    await prisma.purchase.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      scope: mod ? "MODULE" : "WHOLE_COURSE",
      moduleId: mod?.id ?? null,
      // Fully auditable: list price, post-sale price, whether the in-person cut
      // applied, the prior-week credit, and what was actually charged.
      priceCents: amountDueCents,
      listPriceCents: price.listCents,
      effectivePriceCents: price.effectiveCents,
      inPersonDiscountApplied: price.inPersonApplied,
      priorCreditCents: upgrade?.creditCents || null,
      currency: course.currency,
      screenshotAssetId: asset.id,
      status: "PENDING",
    },
    });
  } catch (e) {
    // The partial unique index (migration `purchase_pending_unique`) is the
    // real guard — the read-then-write check above can be raced by a
    // double-tap or a retry on a slow connection. Losing that race is not an
    // error from the student's point of view: their payment IS under review,
    // so say exactly that rather than showing a failure.
    if (
      e && typeof e === "object" && "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: mod
            ? "You already have a payment under review for this week"
            : "You already have a payment under review for this course",
          pending: true,
        },
        { status: 409 },
      );
    }
    throw e;
  }

  // Student confirmation (unchanged) …
  await sendEmail(
    purchaseSubmittedEmail(student.email, mod ? `${course.title} — ${mod.title}` : course.title),
  );
  // … plus an instructor alert, fired at SUBMISSION (not approval) — the whole
  // point is flagging that the review queue needs attention. Best-effort.
  await sendTelegramMessage(
    purchaseSubmittedMessage({
      username: student.username,
      courseTitle: course.title,
      module: mod ? { title: mod.title, orderIndex: mod.orderIndex } : null,
      amountCents: amountDueCents,
      currency: course.currency,
    }),
  );
  return NextResponse.json({ ok: true });
}
