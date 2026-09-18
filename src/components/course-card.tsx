"use client";

import Link from "next/link";
import { ArrowRight, Flame, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/bookmark-button";
import type { CardFill } from "@/lib/card-fills";

/**
 * Signature course card: a big chunky-rounded block in a solid saturated fill
 * that cycles by category. Dark ink text/track on the light fills. The CTA is a
 * flame pill; a category tag sits top-left and a save toggle top-right.
 *
 * The bottom-left slot shows a real progress indicator (lessons-left, or a
 * "done"/"new" state) — we have no enrolled-peer data, and showing other
 * students would be a privacy issue (see PROJECT.md).
 */

// Kit §04 card anatomy: the category pill is white fill + ink border on every
// card fill — it names the subject, it isn't a second accent.
const FILLS: Record<CardFill, string> = {
  sunny: "bg-sunny",
  lilac: "bg-lilac",
  sky: "bg-sky",
  mint: "bg-mint",
};

const CARD_BORDER = "border-brutal border-ink";

export function CourseCard({
  courseId,
  title,
  category,
  href,
  cta,
  fill,
  meta,
  progress,
  saved = false,
}: {
  courseId: string;
  title: string;
  category: string;
  href: string;
  cta: string;
  fill: CardFill;
  /** Fallback bottom-left text when there's no progress (e.g. price, "New"). */
  meta?: string;
  progress?: { completed: number; total: number; percent: number };
  saved?: boolean;
}) {
  const f = FILLS[fill];
  const left = progress ? Math.max(0, progress.total - progress.completed) : null;
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-card p-5 text-ink transition-transform duration-200 hover:-translate-y-1",
        CARD_BORDER,
        f,
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn("rounded-full bg-white px-3 py-1 text-eyebrow uppercase text-ink", CARD_BORDER)}>
          {category}
        </span>
        <BookmarkButton courseId={courseId} saved={saved} />
      </div>

      <h3 className="mt-4 font-display text-card-title">
        {title}
      </h3>

      {progress ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink/70">
            <span>Progress</span>
            <span>
              {progress.completed}/{progress.total} lessons
            </span>
          </div>
          {/* Kit: ink fill on a WHITE track — on a card fill the bar reads ink. */}
          <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white", CARD_BORDER)}>
            <div
              className="h-full rounded-full bg-ink transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex-1" />
      )}

      <div className="mt-5 flex items-end justify-between gap-3">
        {left != null ? (
          left === 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink",
                CARD_BORDER,
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink",
                CARD_BORDER,
              )}
            >
              <Flame className="h-3.5 w-3.5" /> {left} {left === 1 ? "lesson" : "lessons"} left
            </span>
          )
        ) : (
          <span className="text-xs font-medium text-ink/60">{meta}</span>
        )}
        <Link
          href={href}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-flame px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95",
            CARD_BORDER,
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Link>
      </div>
    </article>
  );
}
