import { cn } from "@/lib/utils";

/**
 * Course/lesson progress bar. The fill animates in with `grow-x` (origin-left),
 * consistent with the app's motion language; muted by prefers-reduced-motion.
 */
export function ProgressBar({
  value,
  className,
  tone = "flame",
}: {
  value: number;
  className?: string;
  tone?: "flame" | "success";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full border-brutal border-ink bg-white", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Kit §04: flame fill on a paper/white track, but INK once complete —
          finished work stops asking to be clicked. */}
      <div
        className={cn(
          "h-full origin-left animate-grow-x rounded-full",
          pct >= 100 ? "bg-ink" : tone === "success" ? "bg-success" : "bg-flame",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
