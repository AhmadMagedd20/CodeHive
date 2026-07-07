/**
 * Client-safe password rules + strength scoring. Deliberately free of any
 * server-only imports (no argon2) so it can run in the browser bundle for the
 * live strength meter and shared Zod validation.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/;

export interface PasswordStrength {
  /** Hard requirements met (min length + at least one special char). */
  valid: boolean;
  /** 0-4 score for the meter. */
  score: number;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  checks: {
    length: boolean;
    special: boolean;
    number: boolean;
    uppercase: boolean;
  };
}

export function scorePassword(pw: string): PasswordStrength {
  const checks = {
    length: pw.length >= PASSWORD_MIN_LENGTH,
    special: SPECIAL_CHAR_RE.test(pw),
    number: /[0-9]/.test(pw),
    uppercase: /[A-Z]/.test(pw),
  };

  // Hard requirements per spec: min length + at least one special character.
  const valid = checks.length && checks.special;

  let score = 0;
  if (checks.length) score++;
  if (checks.special) score++;
  if (checks.number) score++;
  if (checks.uppercase) score++;

  const label = (["Too weak", "Weak", "Fair", "Good", "Strong"] as const)[score];
  return { valid, score, label, checks };
}
