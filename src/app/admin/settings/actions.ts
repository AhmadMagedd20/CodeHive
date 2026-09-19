"use server";

import { revalidatePath } from "next/cache";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { parseYouTubeId } from "@/lib/video/youtube";

/**
 * Set (or clear) the public free-lesson video shown at `/free-lesson`.
 *
 * The pasted link is parsed to a bare 11-character id HERE, on the server,
 * rather than stored raw and parsed at render time — the same rule the lesson
 * builder follows. That way the database only ever holds a value the embed can
 * be built from, and a malformed link is rejected while the instructor is
 * still looking at the form rather than silently breaking the public page.
 *
 * An empty URL clears the video, which returns the page to its empty state.
 */
export async function setFreeLesson(formData: FormData) {
  const instructor = await requireInstructor();

  const raw = String(formData.get("url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();

  if (!raw) {
    await prisma.instructor.update({
      where: { id: instructor.id },
      data: { freeLessonVideoId: null, freeLessonTitle: null, freeLessonBlurb: null },
    });
    revalidateFreeLesson();
    return { ok: true, cleared: true };
  }

  const id = parseYouTubeId(raw);
  if (!id) {
    return {
      error:
        "That doesn't look like a YouTube link. Paste the full address from the browser, " +
        "e.g. https://www.youtube.com/watch?v=...",
    };
  }

  await prisma.instructor.update({
    where: { id: instructor.id },
    data: {
      freeLessonVideoId: id,
      freeLessonTitle: title || null,
      freeLessonBlurb: blurb || null,
    },
  });

  revalidateFreeLesson();
  return { ok: true, videoId: id };
}

/**
 * `/free-lesson` is a cached public page, so an edit that isn't pushed through
 * here would not appear until its revalidate window lapsed — the instructor
 * would save, look at the page, and see the old video.
 */
function revalidateFreeLesson() {
  revalidatePath("/free-lesson");
  revalidatePath("/admin/settings");
}
