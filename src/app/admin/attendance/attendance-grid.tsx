"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAttendanceAction } from "../roster/actions";

type Status = "ATTENDED" | "ABSENT" | undefined;

type Student = { id: string; username: string; name: string };
type Week = { week: number; label: string };

/**
 * Roster grid: students down the side, weeks across the top. One click cycles a
 * cell Attended → Absent → (not recorded). Optimistic; persists via a server
 * action. An unmarked cell is visually distinct from Absent.
 */
export function AttendanceGrid({
  courseId,
  students,
  weeks,
  initial,
}: {
  courseId: string;
  students: Student[];
  weeks: Week[];
  initial: Record<string, Status>; // key: `${studentId}:${week}`
}) {
  const [grid, setGrid] = useState<Record<string, Status>>(initial);
  const [, startTransition] = useTransition();

  function cycle(studentId: string, week: number) {
    const key = `${studentId}:${week}`;
    const cur = grid[key];
    const next: Status = cur === undefined ? "ATTENDED" : cur === "ATTENDED" ? "ABSENT" : undefined;
    setGrid((g) => ({ ...g, [key]: next }));

    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("courseId", courseId);
    fd.set("week", String(week));
    fd.set("status", next ?? "CLEAR");
    startTransition(() => {
      void setAttendanceAction(fd);
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border-brutal border-ink bg-card shadow-lift">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-semibold text-ink">
              Student
            </th>
            {weeks.map((w) => (
              <th
                key={w.week}
                title={w.label}
                className="min-w-[3.25rem] px-2 py-3 text-center text-xs font-semibold text-muted-foreground"
              >
                W{w.week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-ink/5 last:border-0">
              <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                <span className="block font-medium text-ink">{s.name}</span>
                <span className="block text-xs text-muted-foreground">{s.username}</span>
              </td>
              {weeks.map((w) => {
                const status = grid[`${s.id}:${w.week}`];
                return (
                  <td key={w.week} className="px-1.5 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => cycle(s.id, w.week)}
                      aria-label={`${s.name} week ${w.week}: ${status ?? "not recorded"}`}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                        status === "ATTENDED" &&
                          "border-success bg-success text-white hover:bg-success-strong",
                        status === "ABSENT" &&
                          "border-danger bg-danger-soft text-danger-strong hover:bg-danger/20",
                        status === undefined &&
                          "border-dashed border-ink/20 text-transparent hover:border-flame/40 hover:bg-accent/40",
                      )}
                    >
                      {status === "ATTENDED" && <Check className="h-4 w-4" />}
                      {status === "ABSENT" && <X className="h-4 w-4" />}
                      {status === undefined && <span className="h-1 w-1 rounded-full bg-ink/20" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
