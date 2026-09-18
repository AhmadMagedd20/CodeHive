import { prisma } from "./prisma";

/**
 * In-person roster + registration-code helpers.
 *
 * A RosterEntry is a student the instructor pre-registered, carrying a
 * single-use code. Its status is DERIVED (never stored) from three timestamps.
 */

export type CodeStatus = "unused" | "used" | "revoked" | "expired";

export function codeStatus(entry: {
  revokedAt: Date | null;
  usedAt: Date | null;
  studentId: string | null;
  codeExpiresAt: Date | null;
}): CodeStatus {
  if (entry.revokedAt) return "revoked";
  if (entry.usedAt || entry.studentId) return "used";
  if (entry.codeExpiresAt && entry.codeExpiresAt.getTime() < Date.now()) return "expired";
  return "unused";
}

// Crockford-ish alphabet: no 0/O/1/I/L/U to avoid ambiguity when read aloud.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomChunk(len: number): string {
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Generate a unique, human-friendly code like "MEGZ-4KQ7-2XPB". */
export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `MEGZ-${randomChunk(4)}-${randomChunk(4)}`;
    const clash = await prisma.rosterEntry.findUnique({ where: { code }, select: { id: true } });
    if (!clash) return code;
  }
  // Astronomically unlikely; widen entropy as a fallback.
  return `MEGZ-${randomChunk(6)}-${randomChunk(6)}`;
}

export type CodeCheck =
  | { ok: true; entry: { id: string; instructorId: string } }
  | { ok: false };

/**
 * Validate a registration code for use. Deliberately returns a single opaque
 * failure so callers can't reveal *why* a code is invalid (no code-guessing).
 * Matching is case-insensitive on a normalised code.
 */
export async function checkRegistrationCode(rawCode: string): Promise<CodeCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false };

  const entry = await prisma.rosterEntry.findUnique({
    where: { code },
    select: {
      id: true,
      instructorId: true,
      revokedAt: true,
      usedAt: true,
      studentId: true,
      codeExpiresAt: true,
    },
  });
  if (!entry) return { ok: false };
  if (codeStatus(entry) !== "unused") return { ok: false };
  return { ok: true, entry: { id: entry.id, instructorId: entry.instructorId } };
}

/** Uppercase, strip spaces; keep only allowed code characters + dashes. */
export function normalizeCode(raw: string): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .trim();
}
