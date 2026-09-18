"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock, Coins, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  id: string;
  title: string;
  duration: string | null;
  locked: boolean;
  lockKind: "drip" | "gated" | "extra" | "unowned" | null;
  completed: boolean;
  current: boolean;
};
export type SidebarModule = {
  id: string;
  number: number;
  title: string;
  count: number;
  items: SidebarItem[];
};

/** Right-column course accordion for the lesson player. Locked lessons keep a
 * clear locked treatment (lilac for gating/drip, sunny for paid extras). */
export function LessonSidebar({
  courseId,
  modules,
  openModuleId,
}: {
  courseId: string;
  modules: SidebarModule[];
  openModuleId: string;
}) {
  const [open, setOpen] = useState<string | null>(openModuleId);

  return (
    <div className="rounded-card border-brutal border-ink bg-white p-3">
      <p className="px-2 pb-2 pt-1 font-display text-lg font-extrabold tracking-display">Course content</p>
      <div className="space-y-1.5">
        {modules.map((m) => {
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="overflow-hidden rounded-2xl border-brutal border-ink">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.id)}
                className="flex w-full items-center gap-3 bg-paper px-3 py-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white">
                  {m.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.title}</span>
                  <span className="block text-xs text-ink/45">{m.count} lessons</span>
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-ink/50 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <ul className="divide-y divide-black/5 px-1.5 py-1.5">
                  {m.items.map((it) => {
                    const inner = (
                      <span
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm",
                          it.current && "bg-sunny",
                          !it.current && !it.locked && "hover:bg-black/[0.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-brutal border-ink",
                            it.locked
                              ? it.lockKind === "extra" || it.lockKind === "unowned"
                                ? "bg-sunny-soft text-sunny-strong"
                                : "bg-lilac-soft text-lilac-strong"
                              : it.completed
                                ? "bg-mint text-ink"
                                : "bg-paper text-ink/70",
                          )}
                        >
                          {it.locked ? (
                            it.lockKind === "extra" || it.lockKind === "unowned" ? (
                              <Coins className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )
                          ) : it.completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3 w-3 fill-current" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate font-medium",
                            it.locked && "text-ink/45",
                            it.current && "font-semibold",
                          )}
                        >
                          {it.title}
                        </span>
                        {it.duration && !it.locked && (
                          <span className="shrink-0 text-xs text-ink/40">{it.duration}</span>
                        )}
                        {it.locked && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                            {it.lockKind === "extra" ? "Paid" : it.lockKind === "unowned" ? "Buy" : "Locked"}
                          </span>
                        )}
                      </span>
                    );
                    // A week the student hasn't bought links to that week's checkout.
                    if (it.locked && it.lockKind === "unowned") {
                      return (
                        <li key={it.id}>
                          <Link href={`/purchase/${courseId}?module=${m.id}`}>{inner}</Link>
                        </li>
                      );
                    }
                    if (it.locked && it.lockKind === "extra") {
                      return (
                        <li key={it.id}>
                          <Link href={`/purchase/${courseId}`}>{inner}</Link>
                        </li>
                      );
                    }
                    if (it.locked) {
                      return <li key={it.id}>{inner}</li>;
                    }
                    return (
                      <li key={it.id}>
                        <Link href={`/courses/${courseId}/lessons/${it.id}`}>{inner}</Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
