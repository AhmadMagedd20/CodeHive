import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../env";

/**
 * Signed media URLs. The local storage/video providers hand out short-lived
 * signed paths to `/api/media` instead of exposing raw file paths. The route
 * verifies the signature (keyed by SESSION_SECRET) before streaming bytes.
 */

export interface MediaClaims {
  key: string;
  exp: number; // unix seconds
  dl: boolean; // force download (Content-Disposition: attachment)
}

function sign(claims: MediaClaims): string {
  const payload = `${claims.key}|${claims.exp}|${claims.dl ? 1 : 0}`;
  return createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
}

export function buildSignedMediaUrl(
  key: string,
  opts: { expiresInSeconds?: number; download?: boolean } = {},
): string {
  const exp = Math.floor(Date.now() / 1000) + (opts.expiresInSeconds ?? 3600);
  const dl = !!opts.download;
  const sig = sign({ key, exp, dl });
  const q = new URLSearchParams({ key, exp: String(exp), dl: dl ? "1" : "0", sig });
  return `/api/media?${q.toString()}`;
}

export function verifySignedMedia(params: URLSearchParams): { ok: boolean; key?: string; dl?: boolean } {
  const key = params.get("key");
  const expRaw = params.get("exp");
  const sig = params.get("sig");
  const dl = params.get("dl") === "1";
  if (!key || !expRaw || !sig) return { ok: false };

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return { ok: false };

  const expected = sign({ key, exp, dl });
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  return { ok: true, key, dl };
}
