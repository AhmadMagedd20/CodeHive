import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-sm",
} as const;

// Kit §04: initials sit on a CARD FILL. The flame avatar is the system account
// only — it is never assigned to a person.
const TONES = {
  lilac: "bg-lilac text-ink",
  sunny: "bg-sunny text-ink",
  sky: "bg-sky text-ink",
  mint: "bg-mint text-ink",
  /** System account only. */
  system: "bg-flame text-white",
} as const;

/** Circular initials avatar with the brutal ink outline. Used wherever a user
 * (student, instructor, teacher) is represented without a real photo.
 * Initials are 900, tracked -0.03em per the kit. */
export function Avatar({
  initials,
  size = "md",
  tone = "lilac",
  className,
}: {
  initials: string;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-brutal border-ink font-display font-black tracking-display",
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
