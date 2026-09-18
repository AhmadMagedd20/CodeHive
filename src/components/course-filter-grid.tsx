"use client";

import { useState } from "react";
import { CourseCard } from "@/components/course-card";
import type { CardFill } from "@/lib/card-fills";
import { cn } from "@/lib/utils";

export type CourseItem = {
  courseId: string;
  title: string;
  category: string;
  href: string;
  cta: string;
  fill: CardFill;
  progress?: { completed: number; total: number; percent: number };
  saved: boolean;
};

const ALL = "All courses";

/** "My courses" heading + category filter pills + the filtered card grid. */
export function CourseFilterGrid({ items }: { items: CourseItem[] }) {
  const categories = [ALL, ...Array.from(new Set(items.map((i) => i.category)))];
  const [active, setActive] = useState(ALL);
  const shown = active === ALL ? items : items.filter((i) => i.category === active);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-subsection">My courses</h2>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={cn(
                  "rounded-full border-brutal border-ink px-4 py-2 text-sm font-semibold transition-colors",
                  active === c ? "bg-ink text-white" : "bg-white text-ink/70 hover:bg-paper",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((it) => (
          <CourseCard
            key={it.courseId}
            courseId={it.courseId}
            title={it.title}
            category={it.category}
            href={it.href}
            cta={it.cta}
            fill={it.fill}
            progress={it.progress}
            saved={it.saved}
          />
        ))}
      </div>
    </div>
  );
}
