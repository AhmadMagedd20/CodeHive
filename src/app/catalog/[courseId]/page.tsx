import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, PlayCircle, Check, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { liveWhere } from "@/lib/content/visibility";
import { getCourseOwnership, type CourseOwnership } from "@/lib/content/access";
import { getModuleCredits } from "@/lib/upgrade-credit";
import {
  isModulePurchasable,
  publicPriceCents,
  bundleSavingCents,
  effectivePriceCents,
  formatPrice,
} from "@/lib/money";
import { PriceTag } from "@/components/price-tag";
import { PublicHeader } from "@/components/public-header";
import { LESSON_TYPE_META } from "@/components/lesson-type";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { courseId: string } }) {
  const c = await prisma.course.findFirst({
    where: { id: params.courseId, isPurchasable: true },
    select: { title: true, description: true },
  });
  return c ? { title: c.title, description: c.description ?? undefined } : {};
}

export default async function CoursePreviewPage({ params }: { params: { courseId: string } }) {
  const course = await prisma.course.findFirst({
    where: {
      id: params.courseId,
      OR: [{ isPurchasable: true, priceCents: { not: null } }, { comingSoon: true }],
    },
    include: {
      modules: {
        where: liveWhere(),
        orderBy: { orderIndex: "asc" },
        include: {
          items: {
            where: liveWhere(),
            orderBy: { orderIndex: "asc" },
            select: { id: true, title: true, type: true, isFreePreview: true },
          },
        },
        // (priceCents / discountPercent / salePriceCents come through by default)
      },
    },
  });
  if (!course) notFound();

  const user = await getCurrentUser();
  let cta = { label: "Buy this course", href: "/register", disabled: false };
  let ownership: CourseOwnership = { enrolled: false, wholeCourse: false, ownedModuleIds: new Set() };
  // Weeks (and the whole course) already awaiting payment review, so we never
  // show a second "Buy" for something the student has already paid for.
  let pendingModuleIds = new Set<string>();
  let wholeCoursePending = false;
  let creditCents = 0;

  if (user?.kind === "student") {
    const [own, pendings] = await Promise.all([
      getCourseOwnership(user.student.id, course.id),
      prisma.purchase.findMany({
        where: { studentId: user.student.id, courseId: course.id, status: "PENDING" },
        select: { scope: true, moduleId: true },
      }),
    ]);
    ownership = own;
    creditCents = (await getModuleCredits(user.student.id, course.id)).reduce(
      (s, c) => s + c.paidCents,
      0,
    );
    wholeCoursePending = pendings.some((p) => p.scope === "WHOLE_COURSE");
    pendingModuleIds = new Set(
      pendings.filter((p) => p.moduleId).map((p) => p.moduleId as string),
    );

    if (ownership.wholeCourse) {
      cta = { label: "Go to your course", href: `/courses/${course.id}`, disabled: false };
    } else if (wholeCoursePending) {
      cta = { label: "Payment under review", href: "/purchases", disabled: false };
    } else {
      // A student who owns some weeks can still upgrade to the full course.
      cta = {
        label: ownership.enrolled ? "Get the full course" : "Buy this course",
        href: `/purchase/${course.id}`,
        disabled: false,
      };
    }
  }

  const totalLessons = course.modules.reduce((n, m) => n + m.items.length, 0);
  const courseEffective = effectivePriceCents(
    course.priceCents,
    course.discountPercent,
    course.salePriceCents,
  );
  // Only advertised when the bundle genuinely beats buying every priced week.
  const saving = course.comingSoon ? null : bundleSavingCents(courseEffective, course.modules);
  const anyWeekForSale = !course.comingSoon && course.modules.some(isModulePurchasable);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href="/catalog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          {/* main */}
          <div>
            <h1 className="font-display text-subsection">{course.title}</h1>
            {course.description && (
              <p className="mt-3 text-lg leading-relaxed text-ink/60">{course.description}</p>
            )}

            <h2 className="mt-10 font-display text-card-title">What&apos;s inside</h2>
            <p className="text-sm text-ink/55">
              {course.modules.length} modules · {totalLessons} lessons.{" "}
              {anyWeekForSale
                ? "Buy the whole course, or pick up a single week on its own."
                : "Preview the free lessons; the rest unlock when you enroll."}
            </p>

            <div className="mt-5 space-y-4">
              {course.modules.map((m, mi) => {
                const owned = ownership.wholeCourse || ownership.ownedModuleIds.has(m.id);
                const weekPrice = publicPriceCents(m);
                const weekPending = pendingModuleIds.has(m.id);
                const sellable = isModulePurchasable(m) && !course.comingSoon;

                return (
                <div key={m.id} className="rounded-card border-brutal border-ink bg-white p-4">
                  {/* Title left, week action right — never wrapping, so every row
                      reads the same regardless of title length or a struck price. */}
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="flex min-w-0 items-center gap-2 font-display font-extrabold tracking-display">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink text-xs text-white">
                        {mi + 1}
                      </span>
                      <span className="min-w-0">{m.title}</span>
                    </p>

                    <div className="flex shrink-0 items-center gap-2.5 sm:justify-end">
                      {owned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border-brutal border-ink bg-mint px-3 py-1 text-xs font-semibold text-ink">
                          <Check className="h-3.5 w-3.5" /> Owned
                        </span>
                      ) : weekPending ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border-brutal border-ink bg-lilac-soft px-3 py-1 text-xs font-semibold text-lilac-strong">
                          <Clock className="h-3.5 w-3.5" /> Under review
                        </span>
                      ) : sellable && weekPrice != null ? (
                        <>
                          <span className="whitespace-nowrap text-sm font-bold text-ink">
                            {formatPrice(weekPrice, course.currency)}
                            {m.salePriceCents != null && m.priceCents != null && (
                              <span className="ml-1.5 text-xs font-normal text-ink/45 line-through">
                                {formatPrice(m.priceCents, course.currency)}
                              </span>
                            )}
                          </span>
                          <Link
                            href={
                              user?.kind === "student"
                                ? `/purchase/${course.id}?module=${m.id}`
                                : "/register"
                            }
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-brutal border-ink bg-flame px-3.5 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
                          >
                            Buy this week
                          </Link>
                        </>
                      ) : (
                        <span className="whitespace-nowrap text-xs font-medium text-ink/45">
                          Included in full course
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {m.items.map((it) => {
                      const { label } = LESSON_TYPE_META[it.type];
                      if (it.isFreePreview) {
                        return (
                          <li key={it.id}>
                            <Link
                              href={`/catalog/${course.id}/preview/${it.id}`}
                              className="flex items-center gap-3 rounded-2xl border border-mint/60 bg-mint-soft px-3 py-2 transition-colors hover:bg-mint/40"
                            >
                              <PlayCircle className="h-4 w-4 shrink-0 text-mint-strong" />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {it.title}
                              </span>
                              <span className="rounded-full bg-sunny px-2.5 py-0.5 text-[11px] font-bold text-ink">
                                Free preview
                              </span>
                            </Link>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={it.id}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2 text-ink/45"
                        >
                          <Lock className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-sm">{it.title}</span>
                          <span className="hidden text-xs sm:inline">{label}</span>
                        </li>
                      );
                    })}
                    {m.items.length === 0 && (
                      <li className="px-3 py-2 text-sm text-ink/45">Lessons coming soon.</li>
                    )}
                  </ul>
                </div>
                );
              })}
            </div>
          </div>

          {/* sticky buy rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border-brutal border-ink bg-white p-6 shadow-soft">
              {course.comingSoon ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac px-3 py-1 text-sm font-semibold text-ink">
                    <Clock className="h-4 w-4" /> Coming soon
                  </span>
                  <p className="mt-3 text-sm text-ink/55">
                    This course isn&apos;t open for enrollment yet. Preview the free lessons below —
                    it&apos;ll be buyable here soon.
                  </p>
                  <span className="mt-5 flex w-full cursor-not-allowed items-center justify-center rounded-full bg-ink/10 px-7 py-3 text-base font-semibold text-ink/40">
                    Not yet available
                  </span>
                </>
              ) : (
                <>
                  <PriceTag
                    priceCents={course.priceCents!}
                    discountPercent={course.discountPercent}
                    salePriceCents={course.salePriceCents}
                    currency={course.currency}
                    size="lg"
                  />
                  <p className="mt-1 text-sm text-ink/55">
                    One-time · lifetime access · every week included
                  </p>
                  {creditCents > 0 && !ownership.wholeCourse && courseEffective != null && (
                    <p className="mt-3 rounded-2xl border-brutal border-ink bg-mint-soft px-3 py-2 text-xs font-semibold text-ink">
                      You&apos;ve already paid {formatPrice(creditCents, course.currency)} for weeks
                      in this course — upgrading to the full course costs{" "}
                      {formatPrice(Math.max(0, courseEffective - creditCents), course.currency)}.
                    </p>
                  )}
                  {saving != null && !ownership.wholeCourse && (
                    <p className="mt-3 rounded-2xl border-brutal border-ink bg-sunny px-3 py-2 text-xs font-semibold text-ink">
                      Best value — save {formatPrice(saving, course.currency)} versus buying each
                      week separately.
                    </p>
                  )}
                  <Link
                    href={cta.href}
                    className={cn(
                      "mt-5 flex w-full items-center justify-center rounded-full px-7 py-3 text-base font-semibold transition-transform hover:scale-[1.02] active:scale-95",
                      cta.label === "Payment under review"
                        ? "border-brutal border-ink bg-white text-ink"
                        : "bg-flame text-white",
                    )}
                  >
                    {cta.label}
                  </Link>
                </>
              )}

              {!user && !course.comingSoon && (
                <p className="mt-3 text-center text-xs text-ink/55">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-flame hover:underline">
                    Log in
                  </Link>
                </p>
              )}

              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "VOD lectures, resume anytime",
                  "Solved LeetCode + live lab prep",
                  "Feedback from Megz on your work",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-ink/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint-strong" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
