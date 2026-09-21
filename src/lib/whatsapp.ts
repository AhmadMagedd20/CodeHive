/**
 * WhatsApp click-to-chat links — the ONLY place the number appears.
 *
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` must be read as a full literal expression.
 * Next.js inlines `NEXT_PUBLIC_*` at BUILD time by textual substitution, so a
 * computed lookup (`process.env[key]`) is not replaced and comes back
 * undefined in the browser. That also means changing the value on the host
 * requires a REBUILD, not just a restart — a saved-but-not-rebuilt variable
 * leaves the buttons hidden.
 *
 * Deliberately NOT added to `lib/env.ts`: that module is server-only (it throws
 * on boot for missing config), and these links are rendered on a public,
 * statically-cached page. An absent number is a normal state here, not a
 * misconfiguration worth refusing to start over.
 */

/** wa.me accepts digits only — no `+`, spaces, dashes or parentheses. */
const NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/**
 * Build a click-to-chat URL, or `null` when no number is configured.
 *
 * Callers must render nothing on `null`. A bare `https://wa.me/` opens
 * WhatsApp with no recipient, which looks broken in a worse way than an
 * absent button does.
 */
export function whatsappLink(message: string): string | null {
  if (!NUMBER) return null;
  return `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Pre-filled openers, kept distinct on purpose: the first word of the message
 * is how the instructor tells a general question apart from an in-person
 * enquiry in a WhatsApp inbox that shows no other context.
 */
export const WHATSAPP_MESSAGES = {
  general: "Hi Megz! I have a question about Cohort Portal.",
  inPerson: "Hi Megz! I'm interested in taking in-person classes. Can you tell me more?",
} as const;
