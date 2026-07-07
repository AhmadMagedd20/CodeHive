/**
 * Standard shape returned by every server action to its form. `useFormState`
 * renders `message` (banner) and `fieldErrors` (inline). `code` carries a
 * machine-readable hint for special UI (e.g. offer "resend verification").
 */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  code?: string;
};

export const initialFormState: FormState = { ok: false };

import { z } from "zod";

/** Flatten a ZodError into our fieldErrors shape (first message per field). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
