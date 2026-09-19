import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isOnSale, startingFromCents, formatPrice } from "@/lib/money";
import { liveWhere } from "@/lib/content/visibility";
import { PriceTag } from "@/components/price-tag";
import { PublicHeader } from "@/components/public-header";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Courses",
  description: "Browse and buy Megz's courses — VOD, solved LeetCode, live lab walk-throughs.",
};
/**
 * Cached for 60s — NOT `force-dynamic`.
 *
 * Public and identical for every visitor: neither this page, `PublicHeader`
 * nor the root layout reads `cookies()`, `headers()` or the session, so there
 * is no per-user state to leak. Ownership and lock state live on the course
 * and lesson pages, which stay dynamic. If anything here ever needs to know
 * who is looking, this export has to go.
 *
 * 60s rather than the landing page's 600s because `liveWhere()` compares
 * `publishAt` to *now*: a scheduled course or week becomes visible only when
 * the page is next rendered, so the cache window is the worst-case delay on a
 * scheduled release. A minute keeps that imperceptible while still collapsing
 * a query-per-visitor down to a query-per-minute.
 */
export const revalidate = 60;

const FILLS = ["bg-sunny", "bg-lilac", "bg-sky", "bg-mint"] as const;

export default async function CatalogPage() {
  const courses = await prisma.course.findMany({
    where: {
      OR: [{ isPurchasable: true, priceCents: { not: null } }, { comingSoon: true }],
    },
    orderBy: [{ comingSoon: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      currency: true,
      discountPercent: true,
      salePriceCents: true,
      comingSoon: true,
      _count: { select: { modules: true } },
      // Phase 5 — priced weeks drive the "Starting from" line. Only live
      // modules count: an unpublished week isn't something a student can use.
      modules: {
        where: liveWhere(),
        select: { priceCents: true, discountPercent: true, salePriceCents: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicHeader />

      <section className="px-4 pb-8 pt-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sunny px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <Sparkles className="h-3.5 w-3.5" /> Buy once, yours to keep
          </span>
          <h1 className="mt-5 font-display text-section">
            Megz&apos;s courses
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-ink/55">
            VOD lectures, solved LeetCode, and live lab walk-throughs — taught by Megz. Pick a
            course, pay via InstaPay, and you&apos;re in.
          </p>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        {courses.length === 0 ? (
          <div className="mx-auto max-w-md rounded-card border-brutal border-ink bg-white p-12 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lilac">
              <Sparkles className="h-6 w-6 text-ink" />
            </span>
            <p className="font-display text-lg font-extrabold tracking-display">No courses on sale yet</p>
            <p className="mt-1 text-sm text-ink/55">
              Check back soon — or if you&apos;re taking a course with Megz in person,{" "}
              <Link href="/login" className="font-semibold text-flame hover:underline">
                log in
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6">
            {courses.map((c, i) => {
              const sale = !c.comingSoon && isOnSale(c.priceCents, c.discountPercent, c.salePriceCents);
              // Cheapest week a student could buy on its own. Null when the
              // course is whole-course-only — then the card reads as before.
              const from = c.comingSoon ? null : startingFromCents(c.modules);
              return (
                <article
                  key={c.id}
                  className={cn(
                    "flex w-full flex-col rounded-card border-brutal border-ink p-6 text-ink transition-transform duration-200 hover:-translate-y-1 sm:w-[21rem]",
                    FILLS[i % FILLS.length],
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded-full bg-ink px-3 py-1 text-eyebrow uppercase text-white">
                      {c.comingSoon ? "Coming soon" : "Course"}
                    </span>
                    {sale && c.discountPercent ? (
                      <span className="rounded-full bg-flame px-2.5 py-1 text-eyebrow uppercase text-white">
                        {c.discountPercent}% off
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 font-display text-card-title">
                    {c.title}
                  </h2>
                  {c.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-ink/65">{c.description}</p>
                  )}

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink/10 pt-4">
                    {c.comingSoon ? (
                      <div>
                        <p className="font-display text-lg font-extrabold tracking-display">Coming soon</p>
                        <p className="mt-0.5 text-xs text-ink/55">
                          {c._count.modules} module{c._count.modules === 1 ? "" : "s"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <PriceTag
                          priceCents={c.priceCents!}
                          discountPercent={c.discountPercent}
                          salePriceCents={c.salePriceCents}
                          currency={c.currency}
                          showBadge={false}
                        />
                        {from != null && (
                          <p className="mt-0.5 text-xs font-semibold text-ink/75">
                            Starting from {formatPrice(from, c.currency)}
                            <span className="font-normal text-ink/55"> / week</span>
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-ink/55">
                          {c._count.modules} module{c._count.modules === 1 ? "" : "s"}
                        </p>
                      </div>
                    )}
                    <Link
                      href={`/catalog/${c.id}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-flame px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
                    >
                      {c.comingSoon ? "Preview" : "View"}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
