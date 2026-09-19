-- Public "free lesson" page (/free-lesson).
--
-- One YouTube video anyone can watch without an account, set from admin
-- settings. Marketing asset, like the hero preview video: no course, no
-- gating, no progress tracking — so it lives on `instructors` rather than
-- becoming a Video/LessonItem.
--
-- `free_lesson_video_id` holds the bare 11-character YouTube id, never a URL.
-- All three are nullable: with no id set, the page renders its empty state.

ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "freeLessonVideoId" TEXT;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "freeLessonTitle" TEXT;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "freeLessonBlurb" TEXT;
