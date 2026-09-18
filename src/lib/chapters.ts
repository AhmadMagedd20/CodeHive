export type Chapter = { seconds: number; label: string };

/** Parse a chapters textarea ("M:SS Label" or "H:MM:SS Label" per line). */
export function parseChapters(raw?: string | null): Chapter[] {
  if (!raw) return [];
  const out: Chapter[] = [];
  for (const line of raw.split("\n")) {
    const m = line.trim().match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
    if (!m) continue;
    const parts = m[1].split(":").map(Number);
    const seconds =
      parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    out.push({ seconds, label: m[2].trim() });
  }
  return out;
}

/** Seconds → "M:SS" or "H:MM:SS". */
export function fmtTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}
