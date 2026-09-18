-- Exactly one PENDING purchase per student + scope.
--
-- The API already checks for an existing PENDING row before inserting, but
-- that is a read-then-write: two submissions racing (a double-tap on the
-- submit button, or a retry on a slow connection) can both pass the check and
-- create two pending payments for the same course.
--
-- COALESCE on moduleId is required: a WHOLE_COURSE purchase leaves it NULL,
-- and Postgres treats NULLs as distinct, so a plain multi-column unique index
-- would not constrain them at all.
--
-- Partial on status = 'PENDING' so a student can still re-submit after a
-- rejection, and can buy the same scope again later if that ever applies.
--
-- NOTE: Prisma's schema language cannot express a partial index, so this lives
-- only here. `prisma migrate dev` may report it as drift and offer to drop it
-- -- do not accept that. `prisma migrate deploy` (what production runs) is
-- unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_one_pending_per_scope"
  ON "purchases" ("studentId", "courseId", COALESCE("moduleId", ''))
  WHERE "status" = 'PENDING';
