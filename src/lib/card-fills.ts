/** Saturated card fills. Plain module so both server and client components can
 * import the values (a client module can't expose runtime values to a server
 * component). */
export const CARD_FILLS = ["sunny", "lilac", "sky", "mint"] as const;
export type CardFill = (typeof CARD_FILLS)[number];

/** Deterministic fill for a category — the same category name always renders
 * the same color (matches how each subject gets one fixed color everywhere it
 * appears), instead of colors shifting whenever the course list reorders. */
export function categoryFill(category: string): CardFill {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0;
  }
  return CARD_FILLS[Math.abs(hash) % CARD_FILLS.length];
}
