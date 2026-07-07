/**
 * A module/lesson item is "live" to students when it's been published OR its
 * scheduled publish time has passed. Admins see everything; students see only
 * live content. The returned clause works for both Module and LessonItem
 * `where` filters (both have `isPublished` + `publishAt`).
 */
export function liveWhere(now: Date = new Date()) {
  return { OR: [{ isPublished: true }, { publishAt: { lte: now } }] };
}

export function isLive(
  x: { isPublished: boolean; publishAt: Date | null },
  now: Date = new Date(),
): boolean {
  return x.isPublished || (x.publishAt != null && x.publishAt <= now);
}
