import { env } from "../env";
import type { PutOptions, SignedUrlOptions, StorageProvider } from "./types";

/**
 * Supabase Storage adapter — the production file backend.
 *
 * Talks to the Storage REST API directly with `fetch` rather than pulling in
 * `@supabase/supabase-js`, matching how the Resend email adapter is written:
 * one dependency-free HTTP seam, nothing else in the app changes.
 *
 * Authenticates with the SERVICE ROLE key, so it bypasses RLS and the bucket
 * must stay **private**. Nothing here is ever called from the browser — every
 * call site is a server component, server action or route handler.
 */

function config() {
  const url = env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  if (!url || !key) {
    throw new Error(
      "STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return { url, key, bucket };
}

function authHeaders(key: string): Record<string, string> {
  // Supabase wants the key in both places: `apikey` identifies the project,
  // `Authorization` carries the role.
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** Percent-encode each path segment but keep the slashes that structure the key. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

async function failure(res: Response, what: string): Promise<never> {
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* body already consumed or empty */
  }
  throw new Error(`Supabase storage ${what} failed (${res.status}): ${detail}`);
}

export const supabaseStorage: StorageProvider = {
  name: "supabase",

  async put(key, data, opts: PutOptions) {
    const { url, key: apiKey, bucket } = config();
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodeKey(key)}`, {
      method: "POST",
      headers: {
        ...authHeaders(apiKey),
        "Content-Type": opts.contentType,
        // Re-running a migration or retrying an upload shouldn't 409.
        "x-upsert": "true",
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) await failure(res, `put ${key}`);
  },

  async getUrl(key, opts: SignedUrlOptions = {}) {
    const { url, key: apiKey, bucket } = config();
    const expiresIn = opts.expiresInSeconds ?? 3600;
    const res = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encodeKey(key)}`, {
      method: "POST",
      headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
    });
    if (!res.ok) await failure(res, `sign ${key}`);
    const body = (await res.json()) as { signedURL?: string; signedUrl?: string };
    // The API returns a path relative to /storage/v1 (field name has varied in
    // case across versions, so accept both).
    const signed = body.signedURL ?? body.signedUrl;
    if (!signed) throw new Error("Supabase storage sign returned no URL");
    const full = `${url}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
    return opts.download ? `${full}${full.includes("?") ? "&" : "?"}download=` : full;
  },

  async getBytes(key) {
    const { url, key: apiKey, bucket } = config();
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodeKey(key)}`, {
      headers: authHeaders(apiKey),
    });
    if (!res.ok) await failure(res, `get ${key}`);
    const data = Buffer.from(await res.arrayBuffer());
    return {
      data,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  },

  async delete(key) {
    const { url, key: apiKey, bucket } = config();
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodeKey(key)}`, {
      method: "DELETE",
      headers: authHeaders(apiKey),
    });
    // A delete of something already gone is not an error worth propagating.
    if (!res.ok && res.status !== 404) await failure(res, `delete ${key}`);
  },

  async exists(key) {
    const { url, key: apiKey, bucket } = config();
    // Range-limited GET: cheapest portable existence probe the REST API offers.
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodeKey(key)}`, {
      headers: { ...authHeaders(apiKey), Range: "bytes=0-0" },
    });
    return res.ok || res.status === 206;
  },
};
