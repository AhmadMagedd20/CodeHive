import { cn } from "@/lib/utils";

/**
 * === Cohort Portal logo ======================================================
 *
 * The approved lockups, as one component. Every logo in the app comes from
 * here — nothing re-types the wordmark inline.
 *
 * The wordmark is **live Inter Tight 900 at -0.04em**, not outlined paths: the
 * kit forbids redrawing or re-spacing it, and live text is the only way to
 * guarantee that at every size. Every proportion below is derived from the mark
 * size, so a lockup can only ever scale as a whole.
 *
 * Tones:
 *  - `default`  flame mark with the ink outline, ink wordmark. Light surfaces.
 *  - `reversed` flame mark, no outline, white wordmark. Ink/dark surfaces.
 *  - `mono`     white mark with the ink outline and an ink `c`, ink wordmark.
 *
 * Clear space: keep the height of the mark clear on all four sides. The
 * component does not add that margin itself — it would break the layouts it
 * sits in — so leave it in the surrounding spacing.
 */

const SIZES = { sm: 26, md: 32, lg: 40, xl: 56 } as const;
export type LogoSize = keyof typeof SIZES;
export type LogoTone = "default" | "reversed" | "mono";

/* Derived from the mark size so the lockup can only scale as a unit. */
const RADIUS = 0.24; // corner radius of the square mark
const GLYPH = 0.54; // the `c` inside the mark
const GAP = 0.3; // mark → wordmark
const WORDMARK = 0.58; // horizontal lockup
const STACKED = 0.46; // stacked lockup, per line

/**
 * Optical lift for the `c`, as a fraction of its own font size.
 *
 * Flex centring centres the *line box*, not the glyph. With `line-height: 1`
 * the half-leading is (1 − (asc 0.969 + desc 0.242)) / 2, which puts the
 * baseline at 0.8635em from the top; the x-height band therefore spans
 * 0.3185em–0.8635em and is centred at 0.591em, i.e. 0.091em below the box
 * centre. Lifting by that amount lands the `c` on the tile's optical centre.
 */
const GLYPH_LIFT = 0.091;

/**
 * The mark on its own: a chunky-rounded flame square (or circle) carrying a
 * lowercase `c`. Minimum size is 24px — below that the counter of the `c`
 * closes up.
 */
export function LogoMark({
  size = "md",
  tone = "default",
  shape = "square",
  className,
}: {
  size?: LogoSize | number;
  tone?: LogoTone;
  shape?: "square" | "circle";
  className?: string;
}) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none",
        tone === "mono" ? "bg-white text-ink" : "bg-flame text-white",
        // The reversed mark drops its outline — on an ink surface an ink
        // outline is invisible anyway, and the kit's reversed lockup has none.
        tone !== "reversed" && "border-brutal border-ink",
        className,
      )}
      style={{
        width: px,
        height: px,
        borderRadius: shape === "circle" ? "9999px" : px * RADIUS,
      }}
    >
      <span
        className="block font-display font-black"
        style={{
          fontSize: px * GLYPH,
          lineHeight: 1,
          transform: `translateY(${-px * GLYPH * GLYPH_LIFT}px)`,
        }}
      >
        c
      </span>
    </span>
  );
}

/** The wordmark on its own — live type, never outlined. */
function Wordmark({
  px,
  tone,
  stacked,
}: {
  px: number;
  tone: LogoTone;
  stacked?: boolean;
}) {
  const ink = tone === "reversed" ? "text-white" : "text-ink";
  if (stacked) {
    return (
      <span
        className={cn("block font-display font-black uppercase tracking-hero", ink)}
        style={{ fontSize: px * STACKED, lineHeight: 0.86 }}
      >
        <span className="block">Cohort</span>
        <span className="block">Portal</span>
      </span>
    );
  }
  return (
    <span
      className={cn("block whitespace-nowrap font-display font-black tracking-hero", ink)}
      style={{ fontSize: px * WORDMARK, lineHeight: 1 }}
    >
      Cohort Portal
    </span>
  );
}

/**
 * Full lockup.
 *
 * - `horizontal` (default) — mark + wordmark on one line. The primary form.
 * - `stacked` — mark + two-line all-caps wordmark.
 * - `wordmark` — two-line all-caps type, no mark.
 * - `mark` — the tile alone.
 */
export function Logo({
  variant = "horizontal",
  size = "md",
  tone = "default",
  shape = "square",
  className,
}: {
  variant?: "horizontal" | "stacked" | "wordmark" | "mark";
  size?: LogoSize | number;
  tone?: LogoTone;
  shape?: "square" | "circle";
  className?: string;
}) {
  const px = typeof size === "number" ? size : SIZES[size];

  if (variant === "mark") return <LogoMark size={px} tone={tone} shape={shape} className={className} />;
  if (variant === "wordmark")
    return (
      <span className={cn("inline-block", className)}>
        <Wordmark px={px} tone={tone} stacked />
      </span>
    );

  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: px * GAP }}>
      <LogoMark size={px} tone={tone} shape={shape} />
      <Wordmark px={px} tone={tone} stacked={variant === "stacked"} />
    </span>
  );
}
