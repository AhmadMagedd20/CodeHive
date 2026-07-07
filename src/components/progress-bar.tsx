import { cn } from "@/lib/utils";

/**
 * Course/lesson progress bar. The fill animates in with `grow-x` (origin-left),
 * consistent with the app's motion language; muted by prefers-reduced-motion.
 */
export function ProgressBar({
  value,
  className,
  tone = "energy",
}: {
  value: number;
  className?: string;
  tone?: "energy" | "success";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full origin-left animate-grow-x rounded-full",
          tone === "success" ? "bg-success" : "bg-energy",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
