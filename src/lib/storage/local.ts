import { promises as fs } from "fs";
import path from "path";
import { env } from "../env";
import { buildSignedMediaUrl } from "./signing";
import type { PutOptions, SignedUrlOptions, StorageProvider } from "./types";

/**
 * Local-filesystem storage — the dev/default provider. Writes objects under
 * STORAGE_DIR and serves them via signed `/api/media` URLs. NOT for production
 * serverless (ephemeral FS); swap STORAGE_PROVIDER=supabase there.
 */
const ROOT = path.resolve(process.cwd(), env.STORAGE_DIR);

// Store the content-type alongside the bytes so the media route can echo it.
const META_SUFFIX = ".meta.json";

function resolveKey(key: string): string {
  const full = path.resolve(ROOT, key);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw new Error("Invalid storage key (path traversal)");
  }
  return full;
}

export const localStorage: StorageProvider = {
  name: "local",

  async put(key, data, opts: PutOptions) {
    const full = resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    await fs.writeFile(full + META_SUFFIX, JSON.stringify({ contentType: opts.contentType }));
  },

  async getUrl(key, opts: SignedUrlOptions = {}) {
    return buildSignedMediaUrl(key, opts);
  },

  async getBytes(key) {
    const full = resolveKey(key);
    const data = await fs.readFile(full);
    let contentType = "application/octet-stream";
    try {
      const meta = JSON.parse(await fs.readFile(full + META_SUFFIX, "utf8"));
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      /* no meta — fall back to octet-stream */
    }
    return { data, contentType };
  },

  async delete(key) {
    const full = resolveKey(key);
    await fs.rm(full, { force: true });
    await fs.rm(full + META_SUFFIX, { force: true });
  },

  async exists(key) {
    try {
      await fs.access(resolveKey(key));
      return true;
    } catch {
      return false;
    }
  },
};
