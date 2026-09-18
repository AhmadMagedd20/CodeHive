import Link from "next/link";
import { Check, Play } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/content/visibility";
import { cn } from "@/lib/utils";

/**
 * Onboarding progress tracker shown across register → verify email → done.
 * A confirmed email is all it takes — there's no manual approval step.
 */
const STEPS = ["Create account", "Verify email"];

export function OnboardingSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mb-5 flex items-center justify-center gap-1.5" aria-label="Onboarding progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 && (
              <span
                aria-hidden
                className={cn("h-0.5 w-4 rounded-full sm:w-6", done || active ? "bg-flame" : "bg-ink/15")}
              />
            )}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                done && "bg-success-soft text-success-strong",
                active && "bg-flame text-white shadow-lift",
                !done && !active && "bg-ink/5 text-ink/45",
              )}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="text-[10px]">{i + 1}</span>
              )}
              <span className={cn(!active && "hidden sm:inline")}>{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * "While you wait" block: turns onboarding dead time into engagement by
 * pointing at real free-preview lessons. Server component; renders a catalog
 * link even when no previews exist.
 */
export async function WhileYouWait() {
  const lessons = await prisma.lessonItem.findMany({
    where: {
      isFreePreview: true,
      ...liveWhere(),
      module: { ...liveWhere(), course: { isPurchasable: true, priceCents: { not: null } } },
    },
    select: {
      id: true,
      title: true,
      module: { select: { course: { select: { id: true, title: true } } } },
    },
    take: 2,
  });

  return (
    <div className="mt-4 w-full rounded-2xl border-brutal border-ink bg-card p-5 shadow-lift">
      <p className="text-sm font-semibold text-ink">While you wait</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        No account needed for these — see exactly what&apos;s inside.
      </p>
      <div className="mt-3 space-y-2">
        {lessons.map((l) => (
          <Link
            key={l.id}
            href={`/catalog/${l.module.course.id}/preview/${l.id}`}
            className="group flex items-center gap-3 rounded-xl border-brutal border-ink bg-background px-3.5 py-2.5 transition-colors hover:border-flame/40 hover:bg-success-soft/30"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame text-white">
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{l.title}</span>
              <span className="block text-[11px] text-muted-foreground">
                Free lesson · {l.module.course.title}
              </span>
            </span>
          </Link>
        ))}
        <Link
          href="/catalog"
          className="block rounded-xl px-3.5 py-2 text-center text-xs font-medium text-flame underline-offset-4 hover:underline"
        >
          Browse all courses →
        </Link>
      </div>
    </div>
  );
}
