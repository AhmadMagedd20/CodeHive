import { config } from "dotenv";
config();

import { promises as fs } from "fs";
import path from "path";

/**
 * One-shot migration of local-disk objects into Supabase Storage.
 *
 *   pnpm migrate:storage           # dry run — lists what would move
 *   pnpm migrate:storage --apply   # actually uploads
 *
 * Keys are preserved exactly, so every `FileAsset.storageKey` already in the
 * database keeps resolving after the switch — no DB rewrite needed. Content
 * types come from the sidecar `.meta.json` the local provider writes.
 *
 * Idempotent: uploads use upsert, so re-running is safe.
 */

const META = ".meta.json";

async function walk(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else if (!e.name.endsWith(META)) out.push(path.relative(base, full));
  }
  return out;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const root = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage");

  if (process.env.STORAGE_PROVIDER !== "supabase") {
    console.error(
      `\nSTORAGE_PROVIDER is "${process.env.STORAGE_PROVIDER ?? "local"}" — set it to "supabase"\n` +
        `(along with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) before migrating.\n`,
    );
    process.exit(1);
  }

  const keys = await walk(root);
  if (keys.length === 0) {
    console.log(`Nothing to migrate — ${root} is empty.`);
    return;
  }

  // Imported late so the env guard above runs before the adapter reads config.
  const { supabaseStorage } = await import("../src/lib/storage/supabase");

  console.log(`\n${apply ? "Migrating" : "DRY RUN —"} ${keys.length} object(s) from ${root}\n`);

  let moved = 0;
  let failed = 0;
  for (const key of keys) {
    const full = path.join(root, key);
    const data = await fs.readFile(full);
    let contentType = "application/octet-stream";
    try {
      const meta = JSON.parse(await fs.readFile(full + META, "utf8"));
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      /* no sidecar — fall back to octet-stream */
    }

    const size = (data.length / 1024).toFixed(0).padStart(6);
    if (!apply) {
      console.log(`  would upload  ${size} KB  ${contentType.padEnd(24)} ${key}`);
      continue;
    }
    try {
      await supabaseStorage.put(key, data, { contentType });
      console.log(`  ✓ ${size} KB  ${key}`);
      moved++;
    } catch (e) {
      console.error(`  ✗ ${key} — ${(e as Error).message}`);
      failed++;
    }
  }

  if (apply) {
    console.log(`\nDone: ${moved} uploaded, ${failed} failed.`);
    if (failed) process.exit(1);
    console.log(
      "Local files were NOT deleted. Verify a few objects load in the app, then remove ./storage by hand.\n",
    );
  } else {
    console.log(`\nDry run only. Re-run with --apply to upload.\n`);
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
