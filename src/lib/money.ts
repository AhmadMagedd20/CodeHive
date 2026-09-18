/** Price helpers. Prices are stored as integer minor units (EGP piastres). */

export function formatPrice(cents: number | null | undefined, currency = "EGP"): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Effective price after a percent discount. Returns the original when there's
 * no valid discount. Discount is clamped to 1–99 (0 / null = full price).
 */
export function discountedCents(
  priceCents: number | null | undefined,
  discountPercent: number | null | undefined,
): number | null {
  if (priceCents == null) return null;
  const pct = discountPercent ?? 0;
  if (!Number.isFinite(pct) || pct <= 0) return priceCents;
  const clamped = Math.min(99, Math.max(1, Math.round(pct)));
  return Math.round((priceCents * (100 - clamped)) / 100);
}

/** True when a course carries a live discount (percent OR an exact sale price). */
export function hasDiscount(discountPercent: number | null | undefined): boolean {
  return !!discountPercent && discountPercent >= 1;
}

/**
 * The public price a course sells for right now. An exact `salePriceCents`
 * (when set below list) wins — it's stored precisely so a typed sale price
 * never drifts. Otherwise fall back to the rounded percent discount.
 */
export function effectivePriceCents(
  priceCents: number | null | undefined,
  discountPercent: number | null | undefined,
  salePriceCents: number | null | undefined,
): number | null {
  if (priceCents == null) return null;
  if (salePriceCents != null && salePriceCents >= 0 && salePriceCents < priceCents) {
    return salePriceCents;
  }
  return discountedCents(priceCents, discountPercent);
}

/** Whether a course is on sale by either mechanism. */
export function isOnSale(
  priceCents: number | null | undefined,
  discountPercent: number | null | undefined,
  salePriceCents: number | null | undefined,
): boolean {
  if (priceCents == null) return false;
  if (salePriceCents != null && salePriceCents < priceCents) return true;
  return hasDiscount(discountPercent);
}

/**
 * Private, unadvertised discount for in-person (code-registered) students.
 * Never shown on the public catalog — only at checkout for these accounts.
 */
export const IN_PERSON_DISCOUNT_PERCENT = 40;

export interface PriceBreakdown {
  listCents: number; // course's normal list price
  effectiveCents: number; // public price after any active sale
  finalCents: number; // what this account actually pays
  inPersonApplied: boolean;
}

/**
 * Full price breakdown for a given account. The in-person 40% stacks on top of
 * whatever the public would pay right now — i.e. it comes off the SALE price
 * when a sale is running, else off the list price. Guarantees an in-person
 * student always pays strictly less than the public, with no edge cases.
 */
export function priceBreakdown(
  priceCents: number,
  discountPercent: number | null | undefined,
  salePriceCents: number | null | undefined,
  isInPerson: boolean,
): PriceBreakdown {
  const effectiveCents = effectivePriceCents(priceCents, discountPercent, salePriceCents) ?? priceCents;
  const finalCents = isInPerson
    ? Math.round((effectiveCents * (100 - IN_PERSON_DISCOUNT_PERCENT)) / 100)
    : effectiveCents;
  return { listCents: priceCents, effectiveCents, finalCents, inPersonApplied: isInPerson };
}

// ---------------------------------------------------------------------------
// Per-week (module) pricing — Phase 5.
//
// A module carries the same price triple as a course, so every helper above
// (effectivePriceCents / isOnSale / priceBreakdown) works on it unchanged: sales
// and the in-person 40% stack at week level exactly as they do at course level.
// The only new rules are which weeks are individually sellable, and how the
// à-la-carte total compares with the course bundle price.
// ---------------------------------------------------------------------------

/** The price fields shared by Course and Module. */
export interface Priced {
  priceCents: number | null;
  discountPercent: number | null;
  salePriceCents: number | null;
}

/**
 * A week is individually purchasable only when the instructor gave it a price.
 * Blank or zero means "available as part of the full course only".
 */
export function isModulePurchasable(m: Priced): boolean {
  return m.priceCents != null && m.priceCents > 0;
}

/** Public effective price for one priced item, or null when not sellable. */
export function publicPriceCents(m: Priced): number | null {
  if (!isModulePurchasable(m)) return null;
  return effectivePriceCents(m.priceCents, m.discountPercent, m.salePriceCents);
}

/**
 * Cheapest individually-purchasable week — the "Starting from EGP X" figure on
 * the catalog. Null when a course has no priced weeks (whole-course only), in
 * which case the card shows just the course price as before.
 */
export function startingFromCents(modules: Priced[]): number | null {
  const prices = modules
    .map(publicPriceCents)
    .filter((c): c is number => c != null);
  return prices.length ? Math.min(...prices) : null;
}

/** Sum of every individually-purchasable week at its current public price. */
export function sumOfWeekPricesCents(modules: Priced[]): number | null {
  const prices = modules
    .map(publicPriceCents)
    .filter((c): c is number => c != null);
  return prices.length ? prices.reduce((a, b) => a + b, 0) : null;
}

/**
 * How much the full-course bundle saves versus buying every priced week
 * separately. Null when there's nothing to compare or the bundle isn't cheaper
 * (we only ever advertise a saving that's real).
 */
export function bundleSavingCents(courseEffectiveCents: number | null, modules: Priced[]): number | null {
  if (courseEffectiveCents == null) return null;
  const sum = sumOfWeekPricesCents(modules);
  if (sum == null) return null;
  const saving = sum - courseEffectiveCents;
  return saving > 0 ? saving : null;
}

/**
 * Normalise a typed list price + sale price into what we store. The sale price
 * is the source of truth (so a typed figure never drifts); `discountPercent` is
 * a rounded companion used only for "% OFF" badges. A blank, negative, or
 * not-actually-cheaper sale price means "full price". Shared by the course and
 * per-week settings forms so both round-trip identically.
 */
export function deriveSalePricing(
  priceCents: number | null,
  saleCents: number | null,
): { salePriceCents: number | null; discountPercent: number | null } {
  if (priceCents == null || saleCents == null) return { salePriceCents: null, discountPercent: null };
  if (saleCents < 0 || saleCents >= priceCents) return { salePriceCents: null, discountPercent: null };
  const pct = Math.round((1 - saleCents / priceCents) * 100);
  // Under half a percent rounds to nothing — treat as full price for badges.
  return { salePriceCents: saleCents, discountPercent: pct < 1 ? null : pct };
}

/** Parse a user-typed percent ("30", "30%") to an int 1–99, or null. */
export function parseDiscountPercent(input: string): number | null {
  const cleaned = String(input).replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(99, n);
}

/** Parse a user-typed price ("1,500" / "1500.00" / "EGP 1500") to minor units. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = String(input).replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
