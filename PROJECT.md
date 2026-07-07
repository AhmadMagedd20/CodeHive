# PROJECT.md — LMS Login & Registration Module

> **Source of truth.** This file is authoritative over the original build prompt wherever they
> conflict, because it reflects what we actually decided as we went. Every code change — however
> small — is recorded here in the same step it is made. Never let this file go stale.

Last updated: **2026-07-05**

---

## 1. Overview

Foundational **Login & Registration** module for a Learning Management System (LMS). Course
content, assignments, etc. come later; this module builds the schema + auth system so those
features can be added without rework.

### Tech stack (confirmed)

| Concern            | Choice                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Framework          | Next.js 14 (App Router), TypeScript, full-stack single codebase       |
| Styling / UI       | Tailwind CSS + shadcn/ui-style components (hand-vendored)              |
| Fonts / motion     | Fredoka (display) + Jost (body) via `next/font`; Framer Motion (landing) |
| Database           | PostgreSQL via Prisma ORM — hosted on **Supabase** (managed Postgres)  |
| Auth               | Custom, server-side opaque session tokens in HTTP-only cookies         |
| Email              | Pluggable `sendEmail()` — console (dev) / SMTP (nodemailer) / Resend   |
| Password hashing   | `@node-rs/argon2` (argon2id, prebuilt binaries — safe on Node 23)      |
| Validation         | Zod (shared client + server)                                          |
| Tests              | Vitest                                                                 |
| Package manager    | pnpm                                                                   |

---

## 2. Current State

Legend: ✅ done · 🚧 in progress · ⬜ not started

| # | Epic / Area                          | Status |
| - | ------------------------------------ | ------ |
| 0 | Project scaffold, config, tooling    | ✅     |
| 0 | Prisma schema + migration            | ✅ (`init` migration applied to Supabase) |
| 0 | Seed script (instructor + courses)   | ✅     |
| 1 | Registration                         | ✅     |
| 2 | Email confirmation                   | ✅     |
| 3 | Admin approval                       | ✅     |
| 4 | Course access control                | ✅     |
| 5 | Login / logout / session             | ✅     |
| 6 | Password management                  | ✅     |
| 7 | Future-proofing (2FA seam, multi-tenant) | ✅ (seams in place; no UI, by design) |
| — | Tests (hashing, single-session, state gating) | ✅ (22 tests passing) |
| — | README                               | ✅     |
| — | Marketing landing page (`/`)         | ✅ (animated, responsive, verified) |

**Verification status.** `pnpm test` → 22 passing. `pnpm typecheck` → clean. `pnpm build` →
succeeds (19 routes). **DB live on Supabase:** `init` migration applied + seed run (1 instructor,
3 courses). Smoke-tested against the live DB: dev server boots, route guards work (`/`→`/login`,
`/admin`→`/login` when unauth), and `authenticate()` returns `ok` for the seeded instructor,
`invalid` for wrong password and unknown users. **Full flow (register → verify → approve → login
→ dashboard) not yet click-tested in a browser.**

**What's built.**
- **Lib:** `env`, `prisma`, `password` (argon2id) + `password-rules` (client-safe strength),
  `tokens` (opaque + HMAC), `email/*` (console/smtp/resend), `auth/account-state`,
  `auth/session` (`persistSession`/`createSession`/`readSession`/revoke — strict single-session),
  `auth/current-user` (route guards), `auth/login` (`authenticate`), `auth/verification`,
  `auth/password-reset`, `rate-limit`, `captcha`, `instructor`, `audit`, `http`,
  `validation/auth`, `form`.
- **Pages:** `/register` → `/register/success` → `/verify-email`; `/login` (+ reason banners for
  elsewhere/expired/password-changed) with inline resend when email unverified; `/forgot-password`,
  `/reset-password`; `/dashboard` (granted courses only); `/account` (change password);
  `/admin` (pending), `/admin/students` (approve via pending page, suspend/reactivate, grant/revoke
  course access), `/admin/courses` (list + create), `/admin/audit`; `/terms`, `/privacy`;
  `POST /api/auth/logout`.
- **Security:** generic login failures + audit of every attempt; per-account lockout after
  `MAX_LOGIN_ATTEMPTS`; single-session takeover with distinct "signed in elsewhere" message;
  password change/reset revokes all sessions; honeypot + rate limiting + optional Turnstile on
  register; HTTPS + security headers via middleware.

---

## 3. Architecture decisions (foundational)

- **Admin/Instructor auth — shared login, role-routed.** `Instructor` and `Student` remain
  separate tables (as specced). A single `Session` model is polymorphic: it holds a nullable
  `studentId` **or** `instructorId`. One `/login` page authenticates both; role determines routing
  (student → `/dashboard`, instructor → `/admin`). Instructors are seeded / CLI-created and never
  self-register. This honours "never hardcode there is exactly one admin": all queries filter by
  `instructorId`.
- **Sessions are server-side + opaque, not JWT.** The strict single-session rule requires
  server-side revocation, so we store one session row per account and check it on every request.
  The cookie carries an opaque random token; only its hash is stored in the DB. `SESSION_SECRET`
  is used to HMAC-sign the cookie value (integrity), not to encode state.
- **Single active session** enforced by a unique constraint on `Session (studentId)` /
  `(instructorId)` plus delete-then-create on login. Old device gets a distinct
  "signed in elsewhere" message on its next request.
- **2FA seam:** `requiresTwoFactor` boolean on both account tables + a global `TWO_FACTOR_ENABLED`
  flag. Login flow has an explicit post-password / pre-session step where a challenge can be
  inserted later. No 2FA UI/logic built yet.

---

## 4. Data model (summary — see `prisma/schema.prisma` for the truth)

- `Instructor` — the "admin". Seeded. `email`, `passwordHash`, `requiresTwoFactor`.
- `Student` — `username`, `email`, `university` (enum GUC/GIU), `passwordHash`, `state`
  (enum), `instructorId` (FK), `failedLoginCount`, `lockedUntil`, `requiresTwoFactor`.
- `Course` — `title`, `instructorId` (FK).
- `StudentCourseAccess` — join (`studentId`, `courseId`), unique together.
- `Session` — polymorphic (`studentId?` / `instructorId?`), `tokenHash`, `expiresAt`,
  `lastActiveAt`, `ip`, `userAgent`. Unique per account.
- `AuditLog` — `event`, `success`, `ip`, `userAgent`, `studentId?` (nullable to avoid leaking
  account existence), `emailAttempted`, `createdAt`.
- `VerificationToken` — email verification, single-use, expiring.
- `PasswordResetToken` — single-use, short expiry.

Account states: `PENDING_EMAIL_VERIFICATION` → `PENDING_ADMIN_APPROVAL` → `ACTIVE` →
(`SUSPENDED` / `REJECTED` / `DEACTIVATED`). Each maps to distinct login behaviour.

---

## 5. Environment variables

See `.env.example`. Every var introduced is logged here.

| Var                          | Purpose                                                        | Required |
| ---------------------------- | ------------------------------------------------------------- | -------- |
| `DATABASE_URL`               | Postgres connection (Supabase pooled, :6543, `?pgbouncer=true`) — app runtime | Yes |
| `DIRECT_URL`                 | Postgres direct/session-pooler connection (:5432) — used by `prisma migrate` | Yes |
| `SESSION_SECRET`             | HMAC secret for signing session cookies                       | Yes      |
| `APP_URL`                    | Public base URL (for links in emails, https redirect)         | Yes      |
| `NODE_ENV`                   | `development` / `production`                                   | Yes (auto) |
| `EMAIL_PROVIDER`             | `console` (default) / `smtp` / `resend`                       | No       |
| `EMAIL_FROM`                 | From address for outgoing mail                                | No       |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP config when provider=smtp          | Cond.    |
| `RESEND_API_KEY`             | Resend key when provider=resend                               | Cond.    |
| `EMAIL_VERIFICATION_TTL_HOURS` | Email confirmation token lifetime (default 48)              | No       |
| `PASSWORD_RESET_TTL_MINUTES` | Reset token lifetime (default 60)                             | No       |
| `SESSION_INACTIVITY_MINUTES` | Auto-expire idle sessions (default 30)                        | No       |
| `MAX_LOGIN_ATTEMPTS`         | Failed logins before lockout (default 5)                      | No       |
| `LOGIN_LOCK_MINUTES`         | Lockout duration after max attempts (default 15)              | No       |
| `CAPTCHA_ENABLED`            | Feature flag for CAPTCHA on register (default false)          | No       |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile keys (if CAPTCHA on) | Cond. |
| `TWO_FACTOR_ENABLED`         | Global 2FA seam flag (default false)                          | No       |
| `VIDEO_PROVIDER`             | Video backend — only `local` implemented (default `local`)    | No       |
| `STORAGE_PROVIDER`           | File storage — `local` (default) or `supabase`                | No       |
| `STORAGE_DIR`                | Local storage root dir (default `./storage`, dev only)        | No       |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Supabase Storage adapter (only if provider=supabase) | Cond. |
| `CRON_SECRET`                | Secret for `POST /api/cron/tick`; unset ⇒ cron disabled       | No (prod: yes) |
| `AT_RISK_INACTIVE_DAYS`      | Inactivity window for the at-risk view (default 7)            | No       |
| `ASSIGNMENT_REMINDER_HOURS`  | Hours-before-due to send reminder emails (default 24)         | No       |
| `SEED_INSTRUCTOR_EMAIL` / `SEED_INSTRUCTOR_PASSWORD` | Credentials for the seeded admin      | No (seed) |

---

## 5b. Phase 2 — Courses & Content (in progress)

Building the LMS content system on top of the Phase 1 auth module. Order of build (each
section depends on the earlier ones).

### Phase 2 status

| # | Section                                   | Status |
| - | ----------------------------------------- | ------ |
| — | Data model + migration (`phase2_content`) | ✅ applied to Supabase |
| — | Video/storage provider abstractions       | ✅ (local impls) |
| 1 | Course structure (modules/lesson items, reorder, publish/schedule) | ✅ |
| 2 | Lesson viewer (video/doc/rich-text, watermark, resume, %-watched)  | ✅ |
| 3 | Quizzes (MCQ/TF/short-answer, auto + manual grade)                 | ✅ |
| 4 | Assignments (code editor / file upload, grading queue, snippets)   | ✅ |
| 5 | Sequential gating (prereqs, locks, per-course toggle, overrides)   | ✅ |
| 6 | Announcements (course/global, email, scheduled, read state)        | ✅ |
| 7 | Progress tracking (per-course %, admin stats, at-risk)             | ✅ |
| + | Edge: streaks/badges, notes, bookmarks, certificates, search, analytics, mobile player, due reminders | ⬜ |

### Media abstractions (key architectural decision)

- **`VideoProvider`** (`src/lib/video/*`): `upload()`, `getStreamUrl()`, `getStatus()`. Only the
  **`local`** placeholder exists — stores the raw file via the storage layer and serves it through
  a short-lived signed URL. **Placeholder pending a real hosting decision.** For ~2h lectures,
  **adaptive bitrate streaming + chapter markers will matter** once Cloudflare Stream / Bunny / Mux
  is chosen; deliberately not built yet. Swappable via `VIDEO_PROVIDER` with zero call-site changes.
- **`StorageProvider`** (`src/lib/storage/*`): `put()`, `getUrl()`, `getBytes()`, `delete()`,
  `exists()`. Default **`local`** (writes under `STORAGE_DIR`, dev only — ephemeral on serverless);
  **`supabase`** adapter reserved (throws until implemented). Signed `/api/media` URLs (HMAC via
  `SESSION_SECRET`) gate access; the media route is built in Section 2.
- **Scheduling**: one secret-protected `POST /api/cron/tick` (built alongside Sections 1/6) will
  process scheduled publishes, scheduled announcements, and 24h due-date reminders. Wire to Supabase
  `pg_cron` or an external scheduler; `CRON_SECRET` gates it.

### Phase 2 data model (see `prisma/schema.prisma`)

Added: `Module`, `LessonItem` (type: VIDEO/DOCUMENT/RICH_TEXT/QUIZ/ASSIGNMENT), `Video`,
`FileAsset`, `Quiz`/`QuizQuestion`/`QuizAttempt`/`QuizAnswer`, `Assignment`/`Submission`/
`FeedbackSnippet`/`AssignmentReminder`, `StudentModuleUnlock`, `LessonProgress`, `LessonNote`,
`Bookmark`, `StudentStreak`, `StudentActivity`, `Certificate`, `Announcement`/`AnnouncementRead`.
Extended: `Course` (+`university`, +`gatingEnabled`), `Student` (+`fullName` for certificates,
+`lastLearningActivityAt`), `Instructor` (Phase 2 back-relations).

Key modelling decisions:
- **Gating pass = explicit Pass/Fail.** `Submission.passed` is set by the admin when grading;
  `Submission.score` is optional (tracking only, never a course grade). A module unlocks when its
  `prerequisiteModuleId` module's gating assignment has a `passed = true` submission — OR the course
  has `gatingEnabled = false` — OR a `StudentModuleUnlock` override exists for that student/module.
- **Publish/schedule.** `isPublished` + optional `publishAt`; an item is "live" to students when
  published or its scheduled time has passed (cron flips the flag for consistency).
- **Quiz correctness** stored as JSON (`options`/`correct`/`response`) to cover MCQ/TF/short-answer
  uniformly; short-answer flagged `needsManualGrade`.

## 5c. Design system — visual overhaul (in progress)

**Direction: "Field journal" — botanical editorial.** Warm layered paper surfaces, ink-on-paper
hierarchy, natural-dye accents, bark-tinted (never gray) shadows, and the logo's **arch** as a
recurring shape motif. Motion follows the landing language (fade + upward slide, gentle hover
scale), CSS-only in the app, `prefers-reduced-motion` respected globally.

### Full palette (Tailwind tokens)

| Family | soft | DEFAULT | strong | Usage |
| ------ | ---- | ------- | ------ | ----- |
| **Core** sage | — | `#9FAE8C` (+`light #B8C4A8`) | — | primary surfaces, icon badges |
| **Core** moss | — | `#6F7E5B` (+`dark #5C6B4A`) | — | primary actions, links, focus |
| **Core** bark | — | `#34402A` (+`dark #232B1C`) | — | ink/text, footer, dark bands |
| **Core** cream / fog / paper | — | `#F3EEDB` / `#EFEAD6` / `#FAF7EE` | — | page + card layering (paper < fog < cream) |
| clay → **`warning`** | `#FCE1CC` | `#E27B3E` | `#9A4A1C` | due soon, pending approval, gating |
| amber → **`highlight`** | `#FCEEBE` | `#F2B01E` | `#8A5804` | streaks, badges, celebration |
| mist → **`info`** | `#D3E7EC` | `#2E93AB` | `#175B6C` | locked, scheduled, info banners |
| rust → **`danger`** | `#FBD6C9` | `#DB4325` | `#8E2810` | late, rejected, failed, destructive |
| fern → **`success`** | `#DBEFC1` | `#5EA62B` | `#356315` | passed, active, completed |

**Energy pass (2026-07-06):** accents pushed to vivid/saturated (above); surfaces separated for
depth (bg `42 42% 89%` deeper cream, card `46 60% 98%` crisp white); primary greener/richer
(`88 34% 38%`); shadows deepened; gradients added — `bg-energy` (lit-green CTA), `bg-sunset`,
`bg-arch-warm`/`bg-arch-fresh` (glowing arch fills), `shadow-glow`/`shadow-glow-gold`. Hero
keyword now a green→gold shimmer.

Rules: components use the **semantic** names (`bg-warning-soft text-warning-strong`), never raw
hexes; every `strong`-on-`soft` pair meets WCAG AA (≥4.5:1). shadcn `--destructive` remapped to
rust. New tokens: shadows `hairline/lift/raised/glow` (bark-tinted), `rounded-arch`,
`.texture-grain`, `.stagger-children` + `rise/grow-x/pop` keyframes.

### Overhaul status

| Page group | Status |
| ---------- | ------ |
| Palette + token foundation | ✅ (user-approved) |
| Shared primitives (Card/Button/Badge/Alert/StateBadge) | ✅ |
| Landing page | ✅ (grain atmosphere, arch icon wells) |
| Auth flows (login/register/verify/reset) | ✅ (fog→paper gradient, arch logo panel, staggered entrance) |
| Student dashboard + account | ✅ (arch-accent course cards, arch empty state, stagger) |
| Course outline + lesson viewer | ✅ (number chips, mist locked system, layered rows, completion pop, pill prev/next) |
| Admin (approvals, students, courses, grading, audit) | ✅ (display headings, arch empty states, semantic badges) |

**Verified in-browser:** login shell, dashboard (arch gate accent), course outline (locked=mist
`#E4E9EC/#4D6273` confirmed via computed styles), admin pending arch empty state; landing hero +
arch feature wells (DOM-inspected — the preview's screenshot pipeline glitches on scrolled
captures, content verified present). `typecheck` + `build` clean.

## 6. Decisions Log

| Date       | Decision / Change                                                                 | Reason |
| ---------- | --------------------------------------------------------------------------------- | ------ |
| 2026-07-05 | Admin auth = shared login, role-routed; polymorphic `Session`.                    | User said "choose which is better"; cleanest fit with separate-entity spec. |
| 2026-07-05 | Use `@node-rs/argon2` instead of `argon2`.                                         | Node 23 is very new; prebuilt napi binaries avoid node-gyp build failures. Spec allows fallback. |
| 2026-07-05 | Sessions are opaque server-side tokens, not JWT.                                   | Strict single-session requires server-side revocation on every request. |
| 2026-07-05 | Rate limiting is in-memory (pluggable interface).                                  | No Redis in local env; interface lets us swap to Upstash/Redis in prod. Logged as a known prod TODO. |
| 2026-07-05 | CAPTCHA = Cloudflare Turnstile, stubbed behind `CAPTCHA_ENABLED` (default off).    | Spec: real CAPTCHA if key available, else stub behind flag. |
| 2026-07-05 | Local DB via docker-compose Postgres; user starts Docker Desktop.                 | Initial user selection; no PG server running locally. |
| 2026-07-05 | **Switched to Supabase (managed Postgres) for everything.** Added `directUrl`/`DIRECT_URL` to the Prisma datasource. Kept custom auth — Supabase Auth NOT used. docker-compose retained as an optional local fallback. | User chose Supabase to avoid the Docker dependency. Supabase Auth can't express our account-state/single-session/approval rules, so we use Supabase purely as the DB. Prisma needs pooled URL at runtime + direct URL for migrations. |
| 2026-07-05 | `DATABASE_URL` uses the Supabase **session pooler (5432)**, not the transaction pooler (6543). | Runtime login hit an intermittent "can't reach …:6543". Transaction pooler is for serverless; a long-running Next.js server should use the session pooler (5432). Both URLs are now 5432; verified stable (3/3 connects). |
| 2026-07-05 | Email delivery set to **Gmail SMTP** (`EMAIL_PROVIDER=smtp`, smtp.gmail.com:587, App Password). | User wanted students to receive real emails in their inbox. Gmail SMTP sends to any recipient without a verified domain (Resend free tier can't). Verified: auth OK + test message accepted (250). Note: free Gmail ~500 recipients/day. |
| 2026-07-05 | **Rebranded product to "The Cohort Portal"** + added logo/favicons + light/dark theme toggle. | User-supplied branding (gate mark, bronze `#A9855F`, wordmark). Renamed all UI copy + email templates from "LMS". Added `brand` color, `components/logo.tsx` (BrandMark/Lockup/Wordmark), `components/theme-toggle.tsx`, a no-flash theme init script in the root layout, and favicons via `src/app/icon.png` + `apple-icon.png`. Theme choice persists in `localStorage`; defaults to system preference. Verified in browser (light + dark, auth + admin). |
| 2026-07-06 | **New brand direction — "soft" moss/cream palette + "c" mark.** Replaced logos and retooled every accent color app-wide. | User supplied a second brand kit. Palette: Sage `#9FAE8C`, Moss `#6F7E5B`, Bark `#34402A`, Cream `#F3EEDB`, Fog `#EFEAD6`. Retooled all shadcn HSL theme tokens in `globals.css` (light = cream page / moss primary / bark ink; dark = deep bark / sage primary / cream ink), updated Tailwind `brand` palette, replaced `logo.tsx` with image-based `BrandLogo` (moss on light, cream on dark; horizontal/stacked/mark variants) using the new PNGs, swapped favicons, and recolored email templates. Old gate-mark/bronze assets removed. Verified in browser (light + dark, auth + admin). Note: brand fonts (Fredoka/Jost) noted in the kit but NOT applied — only logos + colors were requested. |
| 2026-07-06 | **Phase 2 §7 — Progress tracking.** `lib/content/progress.ts`: course completion = COMPLETED `LessonProgress` rows ÷ live lesson items. Quiz-submit + assignment-submit now upsert `LessonProgress` COMPLETED so those items feed progress (readings/videos already did via mark-complete/≥90%). Student: animated (`grow-x`) progress bar + `%`/`x-of-n` on dashboard course cards and course-outline header. Admin `/admin/progress`: **completion table** (student × course, batched queries — few, not N×M) + **"At risk"** (ACTIVE students with no `lastLearningActivityAt` in the last `AT_RISK_INACTIVE_DAYS` days). New `components/progress-bar.tsx`; "Progress" added to admin nav. | Verified in-browser: dashboard Databases **33% (2/6)**, admin completion table + at-risk flips 0→1 ("11d inactive") when activity backdated past the window. `AT_RISK_INACTIVE_DAYS` default 7. |
| 2026-07-06 | **Phase 2 §6 — Announcements + scheduler.** Admin composer (`/admin/announcements`, route `POST /api/admin/announcement`): course-specific OR global, Markdown body (bold/links), one optional image, send-now or scheduled; emails all relevant ACTIVE students on send. Student combined feed (`/announcements`) — global + accessible-course announcements, scope badges, image, Markdown, unread **badge in the student nav** (`StudentNav`, live count) that clears on view (createMany read-marking). **`POST /api/cron/tick`** (secret-gated, idempotent) processes scheduled announcements, scheduled module/lesson publishes, and ~24h due-date reminders (deduped via `AssignmentReminder`). | Verified in-browser: unread badge 2→0 on view, combined feed renders global(teal)+course(sage) with bold/links, admin route returns `{ok,notified:1}` (200), cron guard returns 503 when `CRON_SECRET` unset. "Live" = `sentAt != null` (immediate set on create; scheduled set by cron). Refactored student nav into one `StudentNav` server component (unread count) across dashboard/account/outline. Deploy TODO: point a scheduler at `/api/cron/tick` w/ `x-cron-secret`. |
| 2026-07-06 | **Energy pass (feedback: "too flat, colors muted and near each other").** Kept the green identity but: pushed all 5 accents to vivid/saturated hexes; separated surfaces (deeper cream bg vs crisp near-white cards) for real value contrast; richer greener primary; deeper shadows; added gradient system (`bg-energy` lit-green CTAs via Button default, `bg-arch-warm`/`arch-fresh` glowing arch fills on dashboard cards + empty states, `shadow-glow`); hero keyword → green→gold shimmer; hero glows → fern/amber/clay; gold eyebrow. | The flatness came from everything sitting in one warm mid-tone. Fix = value contrast (white cards lift off deeper cream) + saturation (vivid accents) + warm gold energy against the green core, not abandoning the brand. Verified in-browser: landing, login (lit-green button), dashboard (warm arches), admin (vivid Active pill). |
| 2026-07-06 | **Design overhaul rollout (user-approved palette).** Primitives: Badge → semantic status-pill system (success/warning/danger/info/highlight + legacy names remapped); Alert → semantic soft/strong; Card → `border-bark/10 shadow-lift`; Button → press-scale, moss hover glow, hairline outline. Swept all hardcoded status hexes (green/amber/red/blue-*) to semantic tokens incl. password meter. Locked content recolored warning→**info (mist)** everywhere. Pages: landing (grain, arch feature wells), auth shell (gradient, arch logo panel, stagger), dashboard (arch-gate card accent w/ hover rise, arch empty state), outline (module number chips, layered hover rows, mist locked module/rows), lesson (type-chip eyebrow, pill prev/next, animated Completed pill), admin (3xl display headings, arch empty states for pending + both grading queues). | The arch (logo gate) is the recurring signature; empty states use it in role colors. Completion uses `animate-pop` for the celebratory beat. All motion CSS-only in-app, muted by `prefers-reduced-motion`. |
| 2026-07-06 | **Design overhaul kickoff — palette expansion + token foundation.** Added natural-dye accent families (clay/amber/mist/rust/fern) exposed as semantic tokens (`warning/highlight/info/danger/success`, each soft/DEFAULT/strong), bark-tinted shadow scale, `rounded-arch`, grain texture, stagger/rise/grow/pop motion utilities; `--destructive` remapped from generic red to rust. | User requested a full visual overhaul (frontend-design skill). Direction: "field journal" botanical editorial. All strong-on-soft pairs AA-checked. Foundation only — page-by-page application follows user sign-off per their process. |
| 2026-07-06 | **Phase 2 §5 — Sequential gating.** `lib/content/gating.ts`: a module locks iff course `gatingEnabled` + it has a `prerequisiteModuleId` + the prereq contains ≥1 gating assignment the student hasn't passed + no `StudentModuleUnlock` override. Admin: prerequisite select per module in the course builder; per-student manual unlock/revoke on `/admin/students`. Student: outline shows Locked badge + exact unlock message, items disabled; lesson page blocks deep links server-side with the same message. | Verified in-browser: Week 2 (prereq W1, passed → open), Week 3 (prereq W2 w/ unsubmitted gating assignment → Locked w/ message); deep-link to a W3 lesson renders the locked screen. If a prereq module has NO gating assignment, dependents stay open (nothing to pass). Multiple gating assignments in one prereq ⇒ ALL must be passed. |
| 2026-07-06 | **UI: header rearranged again** — logo far left (vertically centered), divider, Sign out + email next to it; nav links on the right. | User request (screenshot feedback). |
| 2026-07-06 | **Phase 2 §4 — Assignments.** Admin config (`/admin/assignment/[itemId]`): Markdown instructions, due date, `isGating`, submission mode (CODE via **CodeMirror 6** w/ Java/Python/JS/C++/SQL selector, or FILE: pdf/image/zip ≤25MB). Student panel in lesson viewer: submit/resubmit (attempts numbered, late-flagged), grade+feedback visible only after release; resubmit hidden once passed. Grading queue extended: submissions across all courses w/ course+assignment filters, read-only syntax-highlighted code viewer / signed file download, **feedback snippets** (CRUD + insert-then-edit), Pass/Fail + optional score + feedback → "Save & release". | Verified end-to-end in-browser (student SQL submission → admin queue → graded Pass w/ feedback → student sees Passed + feedback; queue count 2→1). Grading auto-releases on save (no separate draft step — simplest matching "released once published"; a draft/hold step can be added later if wanted). `Submission.passed=true` is the gating signal §5 consumes next. Resubmission allowed anytime until passed, incl. while an attempt awaits grading (newest graded next). |
| 2026-07-06 | **Phase 2 §3 — Quizzes.** Admin quiz builder (`/admin/quiz/[itemId]`): settings (window/time-limit/attempts) + MCQ/TF/short-answer questions with dynamic options + reorder. Student quiz panel in the lesson viewer: start (window + attempt-limit enforced), answer, submit → auto-grade MCQ/TF instantly, short-answer flagged for manual grading; per-question reveal + explanations + past attempts. Admin grading queue (`/admin/grading`) lists ungraded short answers across all courses; grading recomputes the attempt score → GRADED. | Verified end-to-end in-browser (took a quiz → 2/4 auto-graded, short-answer queued → appeared in grading queue). Correct answers never sent to the client (graded server-side). MCQ = single-correct (option index); results are tracking-only, never a gate/grade. Time limit enforced client-side (auto-submit); server accepts late (soft). |
| 2026-07-06 | **UI: removed the dark-mode toggle** (forced light everywhere; cleared stored preference) and **mirrored the app header** (Sign out + user on the left, nav + logo on the right). Added a **Grading** admin nav link. | User request. `ThemeToggle` component kept in-repo (unused) for easy re-enable later. |
| 2026-07-06 | **Phase 2 §2 — Content rendering.** Unified lesson viewer (`/courses/[courseId]/lessons/[itemId]`) for video/doc/rich-text with prev-next + mark-complete. Rich text: `react-markdown` + `rehype-highlight` (atom-one-dark tokens on brand bark) + client copy button. Video: watermarked player (drifting name+email overlay, no-download/PiP/context-menu), resume from last position, %-watched → `/api/progress` (sendBeacon). Docs: pdf.js → canvas (no text layer ⇒ no copy/select), per-page watermark, context-menu/print blocked. Admin video/document upload (`/api/admin/content-upload`) + signed streaming (`/api/media`, HTTP Range). | Rich-text path verified in-browser (highlight + copy). Video/PDF built + typechecked; need a real uploaded file to exercise fully. pdf.js worker loaded from unpkg pinned to the installed version. Browser protections are best-effort (nothing client-side is truly download-proof); short-lived signed URLs + no text layer raise the bar. Created a **test student** `student@test.local` / `Student!12345` (ACTIVE, granted the Databases course) to exercise the student side. |
| 2026-07-06 | **Phase 2 §1 — Course structure.** Admin course builder (`/admin/courses/[courseId]`): module/lesson-item CRUD, publish/unpublish + scheduled `publishAt`, reorder. Student outline (`/courses/[courseId]`) + minimal lesson page. | Reorder implemented with **up/down buttons** (not drag-and-drop — simpler, mobile-friendly, accessible; DnD is an acceptable-but-optional enhancement). Rich text stored as Markdown, rendered via `react-markdown`+`remark-gfm` (syntax highlight + copy button land in §2). Content visibility = `isPublished OR publishAt<=now`. Lesson page is minimal pending §2's full viewer. |
| 2026-07-06 | **Phase 2 kickoff — data model + media abstractions.** `phase2_content` migration applied to Supabase; `VideoProvider`/`StorageProvider` interfaces with `local` implementations. | Foundation for all Phase 2 sections. Interfaces keep video host + file backend swappable. Assumptions logged (all reversible): storage=local-now/Supabase-later, gating=explicit admin Pass/Fail, code editor=CodeMirror 6, rich text=Markdown, scheduling=`/api/cron/tick`. Video `local` provider is a placeholder pending a real host (ABR + chapters deferred). |
| 2026-07-06 | **Added public marketing landing page at `/`** (was an auth-redirect). | New animated landing per spec/copy. Added `framer-motion`; added **Fredoka** (display) + **Jost** (body) via `next/font` and wired them into Tailwind `fontFamily` (`font-sans`=Jost app-wide, `font-display`=Fredoka) — the whole app now uses this type system. Added named palette tokens as top-level Tailwind colors (`sage`/`moss`/`bark`/`cream`/`fog` + `sage.light`/`moss.dark`/`bark.dark`/`paper`) so any page can use `bg-sage` etc. Sections in `components/landing/*` (navbar w/ mobile menu, hero w/ word-by-word reveal + gradient keyword, About/stats, 6-card features, 4-step how-it-works, dark CTA banner, footer). Scroll reveals via `whileInView`; `prefers-reduced-motion` softened globally in CSS + via `useReducedMotion`. `.text-gradient`/`.text-gradient-light` + `shimmer`/`float` keyframes added. `/` is now public (logged-in users still reach dashboard via the /login & /register guards). Dashboard empty-state copy updated to the cohort microcopy. Verified desktop + mobile. |
| 2026-07-05 | Split client-safe password rules into `lib/password-rules.ts`; `lib/password.ts` (argon2) is server-only. | Client components (strength meter, Zod schemas) importing `password.ts` dragged the native argon2 binary into the browser bundle and broke `next build`. |
| 2026-07-05 | Admin/course actions use plain `(FormData)` server actions bound to `<form action=…>`; auth forms use `useFormState`. | Admin buttons need no field-level error UI; keeps them progressive-enhancement friendly. |

---

## 7. Known prod TODOs (not blocking this module)

- Swap in-memory rate limiter for Redis/Upstash.
- Wire a real CAPTCHA provider key.
- Implement actual 2FA behind the existing seam.
- Consider background job for token cleanup (expired verification/reset/session rows).
- **Phase 2:** pick a real video host (Cloudflare Stream / Bunny / Mux) — add adaptive bitrate +
  chapter markers for ~2h lectures; implement the Supabase Storage adapter (`STORAGE_PROVIDER=supabase`)
  since local FS is ephemeral on serverless; wire `POST /api/cron/tick` to a real scheduler (Supabase
  `pg_cron` / cron service) with `CRON_SECRET`.
