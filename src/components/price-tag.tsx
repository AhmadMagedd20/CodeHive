import { effectivePriceCents, formatPrice, isOnSale } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Price display that renders the discounted amount with the original struck
 * through and a "% OFF" chip when a course is on sale, or just the price
 * otherwise. The effective price uses the exact `salePriceCents` when set (so a
 * typed sale price never drifts); the "% OFF" chip shows the rounded percent.
 * Used on the catalog, preview rail, and purchase page.
 */
export function PriceTag({
  priceCents,
  discountPercent,
  salePriceCents,
  currency = "EGP",
  size = "md",
  showBadge = true,
  className,
}: {
  priceCents: number;
  discountPercent?: number | null;
  salePriceCents?: number | null;
  currency?: string;
  size?: "sm" | "md" | "lg";
  /** Show the inline "% OFF" chip (turn off where a separate badge exists). */
  showBadge?: boolean;
  className?: string;
}) {
  const onSale = isOnSale(priceCents, discountPercent, salePriceCents);
  const now = effectivePriceCents(priceCents, discountPercent, salePriceCents) ?? priceCents;
  const priceCls = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-display font-extrabold tracking-display text-ink", priceCls)}>
        {formatPrice(now, currency)}
      </span>
      {onSale && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(priceCents, currency)}
          </span>
          {showBadge && discountPercent ? (
            <span className="rounded-full border-brutal border-ink bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger-strong">
              {discountPercent}% OFF
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
