import { randomBytes } from "crypto";

/**
 * Provider-agnostic file storage. Everything in the app that stores/serves a
 * file (documents, submissions, announcement images, certificates, and the
 * local video placeholder) goes through this interface, so the backend can be
 * swapped (local FS ↔ Supabase Storage ↔ S3) without touching call sites.
 */

export interface PutOptions {
  contentType: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  /** Serve with Content-Disposition: attachment. */
  download?: boolean;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, opts: PutOptions): Promise<void>;
  /** A URL a browser can fetch the object from (may be signed / short-lived). */
  getUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  /** Server-side raw read (used by the local /api/media route). */
  getBytes(key: string): Promise<{ data: Buffer; contentType: string }>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/** Build a collision-resistant, path-safe object key under a prefix. */
export function makeStorageKey(prefix: string, filename: string): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  const id = randomBytes(9).toString("base64url");
  return `${prefix.replace(/^\/+|\/+$/g, "")}/${id}-${safe || "file"}`;
}
