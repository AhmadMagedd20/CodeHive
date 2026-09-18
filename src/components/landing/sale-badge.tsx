import { cn } from "@/lib/utils";

/**
 * Circular "sale" sticker: a ring of text that circulates (CSS spin) around a
 * bold percent-off centre. Pure CSS animation — freezes under
 * `prefers-reduced-motion` (handled globally). `id` must be unique per instance
 * on a page (the SVG <textPath> references it).
 */
export function SaleBadge({
  percent,
  className,
  id = "sale-ring",
}: {
  percent: number;
  className?: string;
  id?: string;
}) {
  // Repeated far enough to wrap the full circle; the ring clips at one loop.
  const ring = `SAVE ${percent}%  ·  ENROLL NOW  ·  `.repeat(6);

  return (
    <div
      className={cn("relative aspect-square select-none", className)}
      role="img"
      aria-label={`${percent}% off — limited-time sale`}
    >
      {/* sticker body */}
      <div className="absolute inset-[7%] rounded-full bg-flame shadow-soft" />
      <div className="absolute inset-[7%] rounded-full ring-2 ring-inset ring-white/40" />

      {/* circulating text */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id={id} fill="none" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text
          className="fill-white font-display font-semibold uppercase"
          style={{ fontSize: "14px", letterSpacing: "2.5px" }}
        >
          <textPath href={`#${id}`} startOffset="0">
            {ring}
          </textPath>
        </text>
      </svg>

      {/* centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="font-display text-[2.5rem] font-black leading-none tracking-hero sm:text-5xl">
          {percent}
          <span className="text-2xl sm:text-3xl">%</span>
        </span>
        <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em]">off</span>
      </div>
    </div>
  );
}
