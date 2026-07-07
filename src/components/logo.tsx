import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * The Cohort Portal logos. By default each renders the moss variant on light
 * backgrounds and the cream variant on dark — swapped with CSS so it follows
 * the theme toggle. Pass `color="moss" | "cream"` to force one (e.g. on the
 * always-light landing page, or a fixed-dark footer band).
 */

type Variant = "horizontal" | "stacked" | "mark";
type Color = "auto" | "moss" | "cream";

const SRC: Record<Variant, { moss: string; cream: string; w: number; h: number; alt: string }> = {
  horizontal: {
    moss: "/logo-horizontal-moss.png",
    cream: "/logo-horizontal-cream.png",
    w: 1379,
    h: 283,
    alt: "cohort portal",
  },
  stacked: {
    moss: "/logo-stacked-moss.png",
    cream: "/logo-stacked-cream.png",
    w: 926,
    h: 547,
    alt: "cohort portal",
  },
  mark: {
    moss: "/mark-c-moss.png",
    cream: "/mark-c-cream.png",
    w: 512,
    h: 512,
    alt: "Cohort Portal",
  },
};

export function BrandLogo({
  variant = "horizontal",
  color = "auto",
  className,
  priority,
}: {
  variant?: Variant;
  color?: Color;
  className?: string;
  priority?: boolean;
}) {
  const s = SRC[variant];

  if (color !== "auto") {
    return (
      <span className={cn("inline-flex", className)}>
        <Image
          src={color === "moss" ? s.moss : s.cream}
          alt={s.alt}
          width={s.w}
          height={s.h}
          priority={priority}
          className="h-full w-auto object-contain"
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex", className)}>
      <Image
        src={s.moss}
        alt={s.alt}
        width={s.w}
        height={s.h}
        priority={priority}
        className="h-full w-auto object-contain dark:hidden"
      />
      <Image
        src={s.cream}
        alt={s.alt}
        width={s.w}
        height={s.h}
        priority={priority}
        className="hidden h-full w-auto object-contain dark:block"
      />
    </span>
  );
}

/** The "c" mark alone (e.g. compact / mobile). */
export function BrandMark({ className, color }: { className?: string; color?: Color }) {
  return <BrandLogo variant="mark" color={color} className={className} />;
}
