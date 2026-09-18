import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Wallet, Copy } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  formatPrice,
  isOnSale,
  priceBreakdown,
  isModulePurchasable,
  IN_PERSON_DISCOUNT_PERCENT,
} from "@/lib/money";
import { canUnlockExtras, getCourseOwnership } from "@/lib/content/access";
import { quoteCourseUpgrade } from "@/lib/upgrade-credit";
import { liveWhere } from "@/lib/content/visibility";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseUploadForm } from "./upload-form";

export const metadata = { title: "Buy course" };
export const dynamic = "force-dynamic";

export default async function PurchasePage({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: { module?: string };
}) {
  const student = await requireStudent();

  const course = await prisma.course.findFirst({
    where: { id: params.courseId, isPurchasable: true, priceCents: { not: null } },
    include: { instructor: { include: { instapayQr: true } } },
  });
  if (!course || course.priceCents == null) notFound();
  // Coming-soon courses aren't buyable yet — send them back to the teaser.
  if (course.comingSoon) redirect(`/catalog/${course.id}`);

  // Phase 5 — `?module=` scopes checkout to a single week. It must be a live,
  // individually-priced week of THIS course; anything else falls back to the
  // whole-course flow rather than silently charging the wrong amount.
  const wantedModuleId = searchParams.module?.trim() || null;
  const wantedModule = wantedModuleId
    ? await prisma.module.findFirst({
        where: { id: wantedModuleId, courseId: course.id, ...liveWhere() },
      })
    : null;
  if (wantedModuleId && (!wantedModule || !isModulePurchasable(wantedModule))) {
    redirect(`/catalog/${course.id}`);
  }
  const mod = wantedModule;

  // Already own it, or already have a pending payment → don't let them re-buy.
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
  // In-person DRIP students keep buying to unlock the paid extras (labs/LeetCode);
  // everyone else with access has nothing left to buy.
  const unlockingExtras = canUnlockExtras(student.isInPerson, access);
  if (mod) {
    // Owning the whole course, or this specific week, means nothing left to buy.
    if (ownership.wholeCourse || ownership.ownedModuleIds.has(mod.id)) {
      redirect(`/courses/${course.id}`);
    }
  } else if (ownership.wholeCourse && !unlockingExtras) {
    // Only a genuine whole-course owner has nothing left to buy. A PER_MODULE
    // student has an access row too (it's just the enrolment marker), and must
    // still be able to upgrade to the full course.
    redirect(`/courses/${course.id}`);
  }
  if (pending) redirect("/purchases");

  const qrUrl = course.instructor.instapayQr
    ? await storage.getUrl(course.instructor.instapayQr.storageKey)
    : null;
  const handle = course.instructor.instapayHandle;
  const instructions = course.instructor.instapayInstructions;
  // Price the chosen scope. A week carries its own price triple, so sales and
  // the in-person rate stack exactly as they do on a whole course.
  const priced = mod
    ? { priceCents: mod.priceCents!, discountPercent: mod.discountPercent, salePriceCents: mod.salePriceCents }
    : {
        priceCents: course.priceCents,
        discountPercent: course.discountPercent,
        salePriceCents: course.salePriceCents,
      };
  const onSale = isOnSale(priced.priceCents, priced.discountPercent, priced.salePriceCents);
  const price = priceBreakdown(
    priced.priceCents,
    priced.discountPercent,
    priced.salePriceCents,
    student.isInPerson,
  );
  // Buying the whole course credits any approved single weeks already paid for.
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

  // What the amount is struck FROM: the sale price if on sale, else the list price.
  const strikeFrom = onSale ? price.effectiveCents : price.listCents;
  const payCents = upgrade ? upgrade.dueCents : price.finalCents;

  return (
    <AppShell student={student} active="catalog">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/catalog/${course.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Course details
        </Link>

        <h1 className="font-display text-subsection">
          {mod
            ? `Buy ${mod.title}`
            : unlockingExtras
              ? `Unlock the extras — ${course.title}`
              : `Buy ${course.title}`}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {mod ? (
            <>
              One week of <span className="font-medium text-ink">{course.title}</span>. Pay via
              InstaPay, upload your screenshot, and Megz unlocks this week — usually within a day.
            </>
          ) : unlockingExtras ? (
            "Your lectures stay free with attendance. This one-time payment unlocks the labs, LeetCode, and extra material. Pay via InstaPay, upload your screenshot, and Megz confirms it."
          ) : (
            "Pay via InstaPay, then upload a screenshot of your transfer. Megz reviews it and unlocks the course — usually within a day."
          )}
        </p>
        {mod && (
          <p className="mt-3 rounded-2xl border-brutal border-ink bg-sunny-soft px-4 py-2.5 text-sm text-ink">
            Buying just this week?{" "}
            <Link href={`/purchase/${course.id}`} className="font-semibold text-flame hover:underline">
              Get the full course instead
            </Link>{" "}
            for {formatPrice(
              priceBreakdown(
                course.priceCents,
                course.discountPercent,
                course.salePriceCents,
                student.isInPerson,
              ).finalCents,
              course.currency,
            )}.
          </p>
        )}

        {/* Step 1 — pay */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flame text-sm font-semibold text-white">
                1
              </span>
              Send the payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between rounded-lg bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Amount to send</span>
              <span className="flex items-baseline gap-2">
                {(onSale || price.inPersonApplied) && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(strikeFrom, course.currency)}
                  </span>
                )}
                {onSale && !price.inPersonApplied && priced.discountPercent ? (
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger-strong">
                    {priced.discountPercent}% OFF
                  </span>
                ) : null}
                {price.inPersonApplied && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success-strong">
                    In-person −{IN_PERSON_DISCOUNT_PERCENT}%
                  </span>
                )}
                <span className="font-display text-subsection text-ink">
                  {formatPrice(payCents, course.currency)}
                </span>
              </span>
            </div>
            {price.inPersonApplied && (
              <p className="-mt-1 flex items-center gap-1.5 text-xs text-success-strong">
                <Wallet className="h-3.5 w-3.5" /> Your in-person student rate is applied
                automatically{onSale ? " — on top of the current sale." : "."}
              </p>
            )}

            {/* Upgrade credit — never silently charge a different number. */}
            {upgrade && upgrade.creditCents > 0 && (
              <div className="rounded-2xl border-brutal border-ink bg-mint-soft px-4 py-3 text-sm">
                <p className="font-semibold text-ink">
                  You&apos;ve already paid for {upgrade.credited.length}{" "}
                  {upgrade.credited.length === 1 ? "week" : "weeks"} of this course.
                </p>
                <ul className="mt-1.5 space-y-0.5 text-ink/70">
                  {upgrade.credited.map((c) => (
                    <li key={c.moduleId} className="flex justify-between gap-3">
                      <span className="truncate">
                        Week {c.orderIndex + 1} — {c.title}
                      </span>
                      <span className="shrink-0 font-medium">
                        −{formatPrice(c.paidCents, course.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-ink/15 pt-2 text-ink">
                  Full course {formatPrice(upgrade.finalCents, course.currency)} −{" "}
                  {formatPrice(upgrade.creditCents, course.currency)} already paid ={" "}
                  <span className="font-display font-extrabold tracking-display">
                    {formatPrice(upgrade.dueCents, course.currency)}
                  </span>{" "}
                  to pay now.
                </p>
                {upgrade.overCredited && (
                  <p className="mt-2 text-xs font-medium text-warning-strong">
                    You&apos;ve already paid more than the full-course price, so there&apos;s
                    nothing left to pay — just send EGP 0 / contact Megz and the rest of the course
                    will be unlocked.
                  </p>
                )}
              </div>
            )}

            {handle ? (
              <div className="flex items-center gap-2 rounded-lg border-brutal border-ink px-4 py-3">
                <Wallet className="h-4 w-4 text-flame" />
                <span className="text-sm text-muted-foreground">InstaPay</span>
                <span className="ml-auto font-mono text-sm font-medium text-ink">{handle}</span>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </div>
            ) : (
              <p className="rounded-lg border border-warning/30 bg-warning-soft/40 px-4 py-3 text-sm text-warning-strong">
                Payment details aren&apos;t set up yet — please contact Megz for the InstaPay handle.
              </p>
            )}

            {qrUrl && (
              <div className="flex flex-col items-center gap-2 rounded-lg border-brutal border-ink p-4">
                <Image
                  src={qrUrl}
                  alt="InstaPay QR code"
                  width={180}
                  height={180}
                  unoptimized
                  className="h-44 w-44 rounded-lg object-contain"
                />
                <p className="text-xs text-muted-foreground">Scan to pay with InstaPay</p>
              </div>
            )}

            {instructions && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{instructions}</p>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — proof */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flame text-sm font-semibold text-white">
                2
              </span>
              Upload your proof
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Add a screenshot of the completed transfer. Make sure the amount and reference are
              visible.
            </p>
            <PurchaseUploadForm courseId={course.id} moduleId={mod?.id} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
