import { cn } from "@/lib/utils";

/** Faint dot grid layer (place inside a `relative` container). */
export function DotGrid({ className }: { className?: string }) {
  return <div aria-hidden className={cn("dot-grid pointer-events-none absolute inset-0", className)} />;
}

/**
 * Soft blurred glow blob for depth. Colour/size/position come from `className`
 * (e.g. "bg-sage/40 h-80 w-80 top-0 -left-20"). Gently floats unless the user
 * prefers reduced motion (handled globally in CSS).
 */
export function Glow({ className, float }: { className?: string; float?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        float && "animate-float",
        className,
      )}
    />
  );
}
