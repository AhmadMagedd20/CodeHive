import { env } from "../env";
import { localStorage } from "./local";
import { supabaseStorage } from "./supabase";
import type { StorageProvider } from "./types";

export * from "./types";

/**
 * Resolve the active storage provider from STORAGE_PROVIDER. Import `storage`
 * everywhere; never touch a provider directly.
 *
 * `local` is dev-only — it writes to STORAGE_DIR, which is ephemeral on any
 * serverless host, so every payment screenshot and submission would be lost on
 * the next deploy. Production must run `supabase`.
 */
function resolveStorage(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "supabase":
      return supabaseStorage;
    case "local":
    default:
      return localStorage;
  }
}

export const storage: StorageProvider = resolveStorage();
