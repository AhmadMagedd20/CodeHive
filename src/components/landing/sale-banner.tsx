import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SaleBadge } from "./sale-badge";
import { LandingButton } from "./cta-button";
import { Reveal } from "./motion";

/**
 * Landing-page sale strip. Renders nothing unless at least one purchasable
 * course is discounted; otherwise shows a bold dark panel with the circulating
 * SaleBadge and the best current discount.
 */
export async function SaleBanner() {
  const courses = await prisma.course.findMany({
    where: {
      isPurchasable: true,
      priceCents: { not: null },
      discountPercent: { gte: 1 },
      comingSoon: false, // don't advertise a sale on something you can't buy yet
    },
    select: { discountPercent: true },
  });
  if (courses.length === 0) return null;

  const maxPercent = Math.max(...courses.map((c) => c.discountPercent ?? 0));
  const count = courses.length;

  return (
    <section className="px-4 py-12 sm:px-6">
      <Reveal>
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 overflow-hidden rounded-card bg-ink px-6 py-10 text-center shadow-soft sm:flex-row sm:gap-12 sm:px-12 sm:text-left">
          {/* warm glow accents */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-flame opacity-30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-sunny/25 blur-3xl"
          />

          <SaleBadge percent={maxPercent} className="relative w-32 shrink-0 sm:w-44" />

          <div className="relative flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sunny/40 bg-sunny/10 px-3 py-1 text-eyebrow uppercase text-sunny">
              <Sparkles className="h-3.5 w-3.5" /> Limited-time sale
            </span>
            <h2 className="mt-4 font-display text-section text-white">
              Up to <span className="text-sunny">{maxPercent}% off</span> Megz&apos;s courses
            </h2>
            <p className="mt-3 max-w-xl text-white/70">
              Buy once, keep forever. Pay in seconds via InstaPay — {count} course
              {count === 1 ? "" : "s"} on sale right now.
            </p>
            <div className="mt-6">
              <LandingButton href="/catalog">Shop the sale →</LandingButton>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
