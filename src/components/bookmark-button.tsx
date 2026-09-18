"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleCourseBookmark } from "@/lib/bookmark-actions";

/**
 * Optimistic course-bookmark toggle. Filled when saved. Persists via the
 * server action; falls back gracefully if the request fails.
 */
export function BookmarkButton({
  courseId,
  saved: initial,
  className,
  tone = "ink",
}: {
  courseId: string;
  saved: boolean;
  className?: string;
  tone?: "ink" | "muted";
}) {
  const [saved, setSaved] = useState(initial);
  const [, start] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save course"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !saved;
        setSaved(next);
        const fd = new FormData();
        fd.set("courseId", courseId);
        start(async () => {
          try {
            await toggleCourseBookmark(fd);
          } catch {
            setSaved(!next); // revert on failure
          }
        });
      }}
      className={cn(
        // Kit §04-02: 34px circular target, white fill, ink border.
        "flex h-[34px] w-[34px] items-center justify-center rounded-full border-brutal border-ink bg-white transition-transform hover:scale-105 active:scale-[0.97]",
        tone === "ink" ? "text-ink" : "text-ink/45",
        className,
      )}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current text-ink")} />
    </button>
  );
}
