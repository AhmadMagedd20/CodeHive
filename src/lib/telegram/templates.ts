import { env } from "../env";
import { formatPrice } from "../money";
import { b, esc } from "./index";

/**
 * Fixed templates, one per event, so the alerts stay scannable at a glance:
 * a leading marker, the key detail in bold, then a deep link to the admin page
 * that needs attention.
 */

function link(path: string, label: string): string {
  return `<a href="${env.APP_URL}${path}">${esc(label)}</a>`;
}

/** e.g. "🆕 New signup: **Sarah Ahmed** (sarah@guc.edu.eg) — GUC — in-person code" */
export function newRegistrationMessage(s: {
  username: string;
  email: string;
  university: string;
  isInPerson: boolean;
}): string {
  const path = s.isInPerson ? "in-person code" : "normal registration";
  return [
    `🆕 New signup: ${b(s.username)} (${esc(s.email)})`,
    `${esc(s.university)} — ${path}`,
    link("/admin/students", "Open students →"),
  ].join("\n");
}

/** e.g. "💳 New purchase pending: **Omar Khaled** — Full course: … — EGP 2,000" */
export function purchaseSubmittedMessage(p: {
  username: string;
  courseTitle: string;
  /** Set for a single-week purchase; omitted for a whole-course purchase. */
  module?: { title: string; orderIndex: number } | null;
  amountCents: number;
  currency: string;
}): string {
  const what = p.module
    ? `Week ${p.module.orderIndex + 1} of ${p.courseTitle} — ${p.module.title}`
    : `Full course: ${p.courseTitle}`;
  return [
    `💳 New purchase pending: ${b(p.username)}`,
    `${esc(what)} — ${b(formatPrice(p.amountCents, p.currency))}`,
    `Awaiting your review.`,
    link("/admin/payments", "Open pending payments →"),
  ].join("\n");
}
