import { prisma } from "@/lib/prisma";
import { priceBreakdown, type PriceBreakdown } from "@/lib/money";

/**
 * Upgrade credit — a student who already bought individual weeks in a course
 * shouldn't pay for that content twice when they buy the whole course.
 *
 * The credit is what they ACTUALLY PAID (`Purchase.priceCents`, post-sale and
 * post in-person discount at the time), not the week's current list price, so
 * later price changes can't retroactively inflate or shrink it. Only APPROVED
 * module purchases count — pending or rejected ones are not money received.
 */

export interface UpgradeQuote extends PriceBreakdown {
  /** Total already paid for approved single-week purchases in this course. */
  creditCents: number;
  /** What they pay now: the course's final price minus credit, floored at 0. */
  dueCents: number;
  /** Credit exceeded the course price — they've already paid more piecemeal. */
  overCredited: boolean;
  /** The weeks that earned the credit, for showing "you already paid X for Y". */
  credited: { moduleId: string; title: string; orderIndex: number; paidCents: number }[];
}

/** Approved single-week purchases this student made in this course. */
export async function getModuleCredits(studentId: string, courseId: string) {
  const rows = await prisma.purchase.findMany({
    where: {
      studentId,
      courseId,
      scope: "MODULE",
      status: "APPROVED",
      moduleId: { not: null },
    },
    select: {
      priceCents: true,
      module: { select: { id: true, title: true, orderIndex: true } },
    },
  });
  return rows
    .filter((r) => r.module)
    .map((r) => ({
      moduleId: r.module!.id,
      title: r.module!.title,
      orderIndex: r.module!.orderIndex,
      paidCents: r.priceCents,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Full quote for buying the WHOLE course, crediting prior week purchases.
 * Order of operations (per the pricing rules): sale → in-person 40% → minus
 * what they already paid. Never negative.
 */
export async function quoteCourseUpgrade({
  studentId,
  courseId,
  priceCents,
  discountPercent,
  salePriceCents,
  isInPerson,
}: {
  studentId: string;
  courseId: string;
  priceCents: number;
  discountPercent: number | null;
  salePriceCents: number | null;
  isInPerson: boolean;
}): Promise<UpgradeQuote> {
  const base = priceBreakdown(priceCents, discountPercent, salePriceCents, isInPerson);
  const credited = await getModuleCredits(studentId, courseId);
  const creditCents = credited.reduce((sum, c) => sum + c.paidCents, 0);
  const dueCents = Math.max(0, base.finalCents - creditCents);
  return {
    ...base,
    creditCents,
    dueCents,
    overCredited: creditCents > base.finalCents,
    credited,
  };
}
