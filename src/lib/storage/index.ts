import { env } from "../env";
import { localStorage } from "./local";
import type { StorageProvider } from "./types";

export * from "./types";

/**
 * Resolve the active storage provider from STORAGE_PROVIDER. Only "local" is
 * implemented today; "supabase" is reserved (adapter to be added — see
 * PROJECT.md Phase 2). Import `storage` everywhere; never touch a provider
 * directly.
 */
function resolveStorage(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "supabase":
      throw new Error(
        "STORAGE_PROVIDER=supabase is not implemented yet. Use 'local' or add the Supabase adapter.",
      );
    case "local":
    default:
      return localStorage;
  }
}

export const storage: StorageProvider = resolveStorage();
