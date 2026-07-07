import { createHash, randomBytes, createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";

/**
 * Single-use / session token helpers. We generate a high-entropy random token,
 * hand the raw value to the user (in a link or cookie), and persist only its
 * SHA-256 hash. Lookups hash the incoming value and compare.
 */

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Session cookie value = `<token>.<hmac>`. The HMAC (keyed by SESSION_SECRET)
 * lets us reject tampered/forged cookies before any DB lookup. The DB stores
 * only hashToken(token).
 */
export function signSessionValue(token: string): string {
  const sig = createHmac("sha256", env.SESSION_SECRET).update(token).digest("base64url");
  return `${token}.${sig}`;
}

export function unsignSessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const token = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = createHmac("sha256", env.SESSION_SECRET).update(token).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}
