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

**Audited against the code on 2026-09-09.** Where this section and the code disagreed, the code
won. Legend: ✅ works end to end · 🟡 partial (see note) · ⬜ model/seam only, no code · ❌ removed.

### Phase 1 — auth

| Area | Status | Note |
| ---- | ------ | ---- |
| Registration | ✅ | honeypot + rate limit + optional Turnstile |
| Email verification | ✅ | |
| Admin approval | ❌ **removed** | verification now sets `ACTIVE` directly. `PENDING_ADMIN_APPROVAL` is unreachable; `approveStudentAction`/`rejectStudentAction` and `reject-dialog.tsx` are **dead code** (the dialog is rendered nowhere). The docstring on `consumeVerificationToken` still describes the old behaviour. |
| Account states | 🟡 | one of six states is now unreachable |
| Login / logout / single-session | ✅ | enforced at DB level (`@unique` on `Session.studentId`/`instructorId`) |
| Password management | ✅ | change/reset revokes all sessions |
| Audit log | ✅ | |
| Tests | 🟡 | 22 passing, but only 4 files, all auth primitives. **No tests for money, access, gating or purchase.** |

### Phase 2 — content

Course structure, video lessons, documents, rich-text/code lessons, quizzes, assignments, gated
progression, announcements, progress tracking: all ✅.

The "extras" are mostly **schema-only** — the models exist and migrate, but nothing reads or writes
them:

| Extra | Status |
| ----- | ------ |
| Instructor analytics (`/admin/progress`) | ✅ |
| Reminder emails | 🟡 built in `/api/cron/tick`; needs an external scheduler + `CRON_SECRET` |
| Streaks (`StudentStreak`, `StudentActivity`) | ⬜ 0 call sites |
| Lesson notes (`LessonNote`) | ⬜ 0 call sites |
| Per-lesson bookmarks (`Bookmark`) | ⬜ 0 call sites (course-level `SavedCourse` **is** wired) |
| Certificates (`Certificate`) | ⬜ 0 call sites |
| Search | ⬜ input renders in the app shell, wired to nothing |

### Phases 3–5 and later

Catalog, course preview, free preview lesson, InstaPay purchase, screenshot review, purchase
history: ✅. Roster, registration codes, 40% in-person discount, drip access, attendance: ✅.
Per-module pricing, "starting from", single-week purchase, upgrade credit: ✅. Landing page, UI
redesign, decoration layer, logo system, Telegram alerts: ✅.

### Known stubs and gaps (see §8 for the launch view)

1. **Storage has no production adapter.** `resolveStorage()` **throws** on
   `STORAGE_PROVIDER=supabase`; only local disk exists. On any ephemeral host this loses payment
   screenshots, submissions, documents and announcement images.
2. **Video provider is `local` only** — files served from disk through `/api/media`.
3. **`/api/media` reads the entire file into memory** (`getBytes` → Buffer → slice) on every
   request, including Range requests. Fine for a 2 MB PDF, not for lecture video.
4. **No error boundaries anywhere** — no `error.tsx`, `global-error.tsx` or `not-found.tsx`.
5. **Rate limiting covers auth only**; `/api/purchase`, `/api/assignment/submit`, `/api/media`,
   `/api/quiz/*` and `/api/progress` are unlimited. The limiter is also in-memory (per-instance,
   resets on deploy).
6. **Terms and Privacy are placeholder copy.**
7. `Purchase` has no unique constraint preventing two concurrent PENDING rows for the same
   student+scope; the guard is a read-then-write check.

**Verification.** `pnpm test` → 22 passing. `pnpm typecheck` → clean. `pnpm build` → succeeds.
All admin pages and all 12 API routes carry a guard (`/admin/page.tsx` is covered by the admin
layout). Session cookies are `httpOnly`, `secure` in prod, `sameSite=lax`.

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

## 5c′. Design system v2 — "bold friendly" (2026 overhaul; replaced the retired field-journal palette)

**Direction: bold, friendly, high-contrast, chunky-rounded.** Saturated block-colour cards on an
off-white canvas, near-black ink, a flame-orange primary. Mostly flat with crisp 1px borders; soft
shadow only on floating elements. One rounded family (**Kodchasan**) for everything, differentiated
by weight/size. `prefers-reduced-motion` respected globally.

- **Type:** Kodchasan (Google, weights 400/500/600/700) via `next/font`, wired to `--font-kodchasan`
  → `font-sans` + `font-display`. Headings heavy/tight (`font-bold`), body regular.
- **Core palette** (`tailwind.config.ts` + `globals.css` HSL vars): `ink #151313`, `flame #FF5734`
  (primary), `lilac #BE94F5`, `sunny #FCCC42`, `sky #73C2FB`, `mint #7FD9A6` (four sibling card
  fills), `paper #F7F7F5` (canvas), `white` (cards).
- **Semantic tokens** (soft/DEFAULT/strong triples, AA strong-on-soft): `success`→grass green
  `#1FA25A` (white-legible), `warning`/`highlight`→`sunny`, `danger`→**berry `#E23744`** (a distinct
  red, NOT flame, since flame is the primary action colour), `info`/locked→`lilac`.
- **shadcn vars repointed:** background=paper, card=white, primary=flame, destructive=berry,
  `--radius: 1rem`. `Button` variants repointed (default = flame pill; all buttons `rounded-full`).
- **Shape/depth:** `rounded-card` (22px) on cards, pill buttons, `shadow-soft`/`shadow-soft-lg` for
  floating only; text colour chosen per fill (ink on the light pastels; white on flame/ink).
- **App shell** (`components/app-shell.tsx`): floating **ink icon rail** (active item = filled
  `sunny` square, logout bottom) → collapses to a floating **bottom bar** on mobile; **top bar**
  with the "Cohort **Portal**" wordmark, a (visual-only) search, a bell wired to unread
  announcements, and the avatar + name/handle.
- **Course card** (`components/course-card.tsx`): saturated fill cycling `sunny/lilac/sky/mint`,
  category pill, **functional bookmark** (`SavedCourse` model + `bookmark-actions.ts` +
  `bookmark-button.tsx`), ink progress bar on a tinted track, a **lessons-left / "Completed"**
  indicator bottom-left (real data — no fabricated enrolled-peer avatar stack), flame CTA.
- **Lesson player** (two-column): breadcrumb, back + course title, `sunny` stat chips (lessons /
  duration), main content block with a circular flame play affordance + clickable **chapters**
  (`LessonItem.chapters` field + admin textarea + in-`VideoPlayer` seeking), and a right-column
  **module accordion** (`lesson-sidebar.tsx`) with the current lesson highlighted and locked/paid
  lessons kept in the new locked treatment (lilac = gating/drip, sunny = paid extra). All content
  protection (watermark, no-download, single-session, gating/drip/extra) preserved.
- **Restyled:** app shell, course card, dashboard, lesson player, course outline, announcements,
  purchases, account, purchase/checkout, catalog, catalog preview, public header, auth layout,
  admin header/shell, the shadcn Button (app-wide), **and the full landing** (navbar, hero,
  sale-banner + sale-badge, before/after, free-lessons, feature-showcase + feature-mocks, proof,
  path-picker, how-it-works, cta-banner, footer). The `.text-gradient` keyword + `.dot-grid` were
  repointed to the new palette.
- **Cleanup (done 2026-07-14):** the old palette is fully retired. Removed the legacy tokens
  (`sage/moss/bark/cream/fog` + `clay/amber/mist/rust/fern`, the `brand.*` map), the old
  gradients (`bg-energy/sunset/arch-warm/arch-fresh`), the `shadow-glow`/`glow-gold`/`raised`
  scale, and the `rounded-arch` radius from `tailwind.config.ts`; re-tinted the remaining
  `shadow-hairline`/`lift` from bark-green to ink. Swept the last old-palette classes in the admin
  internals (roster/attendance/payments/progress/grading/announcements — section-header icons are
  now chunky rounded-square card fills) and in `markdown`/`code-block`/`copy-code`/`onboarding-steps`/
  `progress-bar`/`badge`/`ui/card`/`sale-badge`/`preview`. Deleted the now-dead components
  `logo.tsx`, `app-header.tsx`, `student-nav.tsx`, and `theme-toggle.tsx` (dark mode is force-off),
  plus the stale `.dark` block in `globals.css`. `build` (30 routes) clean; landing verified
  in-browser on the new palette.
- **Open items flagged to user:** search box is visual only (no global-search backend); the
  reference's enrolled-peer avatar stack was replaced with a real lessons-left indicator.

---

## 5d. Phase 3 — Self-serve course purchases (InstaPay)

Adds a **second, additive** enrollment path alongside the existing manual grant. Both coexist:

- **In-person path (unchanged):** register → verify email → admin approves account → admin
  manually grants course access. No payment.
- **Self-serve path (new):** register → verify email → **admin approves account** → browse the
  public catalog → pick a course → pay via InstaPay → upload the transfer screenshot → **admin
  reviews/approves the payment** → course access granted automatically.

**Two gates, by design.** Account-level admin approval still applies exactly as before (it decides
*who gets an account*). Payment approval is a **separate, additional** gate that only confirms
*money was actually received*. See the friction note in the Decisions Log (2026-07-09).

### Phase 3 status

| # | Section                                                             | Status |
| - | ------------------------------------------------------------------- | ------ |
| — | Data model + migration (`purchases`)                                | ✅ applied to Supabase |
| 1 | Public course catalog + per-course preview + free-preview lessons   | ✅ verified |
| 2 | Purchase flow (InstaPay pay → screenshot upload → Purchase record)  | ✅ verified |
| 3 | Admin review (Pending Payments queue → Approve/Reject → auto-grant) | ✅ verified end-to-end |
| 4 | Notifications (submitted / approved / rejected+reason)              | ✅ (emails wired) |
| 5 | Student purchase history (`/purchases`, per-course status)          | ✅ verified |
| 6 | Per-course percent discounts + rotating landing "SALE" badge        | ✅ verified |
| + | Coupon codes / discount expiry (optional later add-on — not built)  | ⬜ |

### Phase 3 data model (see `prisma/schema.prisma`)

- **`Purchase`** — `studentId`, `courseId`, `priceCents` (price **snapshot** at purchase),
  `currency` (`EGP`), `screenshotAssetId?` (→ `FileAsset`), `status` (`PENDING`/`APPROVED`/
  `REJECTED`), `rejectionReason?`, `reviewedAt?`, `reviewedById?` (→ `Instructor`), timestamps.
  Indexed on `studentId`/`courseId`/`status`.
- **`Course`** +`isPurchasable` (bool, default false), +`priceCents?`, +`currency` (default `EGP`),
  +`discountPercent?` (1–99 = on sale; null/0 = full price).
- **`LessonItem`** +`isFreePreview` (bool) — admin-designated lessons viewable publicly, no account.
- **`Instructor`** +`instapayHandle`, +`instapayInstructions`, +`instapayQrAssetId?` (→ `FileAsset`)
  — payment details are **configurable from admin settings, never hardcoded**.

### What's built (Phase 3)

- **Money:** `lib/money.ts` — `formatPrice(cents, currency)` (Intl `en-EG`) + `parsePriceToCents`.
  Prices stored as integer minor units (EGP piastres), like all money in the app.
- **Public (no-login):** `PublicHeader` component; `/catalog` (purchasable courses — title, blurb,
  price, module count); `/catalog/[courseId]` (full outline with locked/greyed lessons, free-preview
  lessons linked + badged, context-aware "Buy" CTA, sticky price rail, in-person "log in" note);
  `/catalog/[courseId]/preview/[itemId]` (free-preview viewer — video/doc/rich-text; quiz/assignment
  show a "create an account to try" upsell). "Courses" added to the landing navbar.
- **Purchase:** `/purchase/[courseId]` (Step 1 pay: amount + InstaPay handle + QR + instructions;
  Step 2 upload proof — `PurchaseUploadForm`, mobile-camera `capture`); `POST /api/purchase`
  (multipart, image ≤10MB, guards: already-owned → 400, existing PENDING → **409** duplicate,
  creates `Purchase(PENDING)` with price snapshot, emails `purchaseSubmitted`).
- **Admin:** `/admin/payments` — payment-settings card (`PaymentSettingsForm` → `POST
  /api/admin/instapay`, handle/instructions/QR) + **Pending Payments queue** (student, course,
  price, date, full-size screenshot; `PurchaseActions` Approve / Reject-with-reason →
  `approvePurchaseAction`/`rejectPurchaseAction`). Approve upserts `StudentCourseAccess` +
  flips `Purchase` to APPROVED **in one `$transaction`**, audits `COURSE_ACCESS_GRANTED`, emails
  `purchaseApproved`. "Payments" added to admin nav.
- **Student history:** `/purchases` — per-course status (PENDING→info "Under review",
  APPROVED→success + "Open" link, REJECTED→danger + reason + "Re-upload proof"). "Purchases" added
  to `StudentNav`.
- **Emails:** `purchaseSubmittedEmail` / `purchaseApprovedEmail` / `purchaseRejectedEmail` (reason).

**Out of scope (confirmed with user):** no real payment gateway / auto-verification, no refunds,
no coupons (coupons flagged as an easy later add-on).

## 5e. Phase 4 — In-person students: codes, granular access, attendance

A **third** enrollment path for students who take Megz's classes in real life, additive to the
Phase 1 manual path and the Phase 3 self-serve path (neither changed).

- **In-person path (NEW):** Megz pre-registers a student by name → generates a single-use code →
  student registers with the code (ticks "I'm taking classes with Megz in person") → the code
  links them to Megz's roster + flags the account in-person → **email verification auto-approves
  the account** (the code IS the approval) → Megz controls content release + records attendance.

### Data model (see `prisma/schema.prisma`)

- **`RosterEntry`** — one pre-registered in-person student + their code. Status is **derived, not
  stored**: `revokedAt` > (`usedAt`/`studentId`) > `codeExpiresAt<now` > else unused. `studentId`
  links the account that consumed the code (onDelete `SetNull` keeps history). Structured so a CSV
  bulk-import can be added later with no schema change.
- **`Student.isInPerson`** — set true when registered with a code. Drives in-person pricing + the
  code auto-approval branch.
- **`StudentCourseAccess.accessMode`** (`CourseAccessMode` = `FULL`/`DRIP`/`GATED`, default
  `GATED`). Per-student, per-course; exactly one at a time.
- **`StudentModuleRelease`** — drip release of one module ("lecture") to one student. Sole
  visibility driver in DRIP mode. **Distinct from `StudentModuleUnlock`** (a GATED escape hatch) —
  never conflated.
- **`AttendanceRecord`** — per student, per course, per `week` (`ATTENDED`/`ABSENT`; a missing row
  = "not recorded"). **Week N ↔ the Nth module by orderIndex.**
- **`Purchase`** +`listPriceCents` / `effectivePriceCents` / `inPersonDiscountApplied` — clear
  three-number record (`priceCents` is now the FINAL charged amount).
- **`Instructor.attendanceAutoRelease`** — the opt-in toggle (default off) for the
  attendance→release automation.

### Access-mode precedence (a student is on exactly ONE mode per course)

- **FULL** → nothing locked.
- **DRIP** → a module is locked unless the instructor released it (`StudentModuleRelease`).
  **Assignment-passing does NOT unlock — only the instructor does.** Independent of Phase 2 gating.
- **GATED** → the Phase 2 assignment gating (`getModuleLockStates`), itself a no-op when the course
  has `gatingEnabled = false`. Default `GATED` reproduces pre-Phase-4 behaviour exactly (GATED on a
  non-gating course ≡ FULL). `getEffectiveModuleLockStates` (`lib/content/access.ts`) unifies all
  three into the existing `Map<moduleId, ModuleLockState>` shape, so the outline + lesson-guard
  consume it unchanged; drip locks reuse the existing `mist → info` "locked" styling.

### In-person pricing (private 40%)

- `IN_PERSON_DISCOUNT_PERCENT = 40`, **unadvertised** — never on the public catalog/preview (they
  always show list-or-sale price). Applied only for a code-linked account, on the **checkout page +
  purchase API** (authoritative). `priceBreakdown()` stacks it on the **current effective price**:
  off the sale price when a sale runs, else off list — so an in-person student **always** pays
  strictly less than the public, no edge cases. Applied automatically (code already consumed; no
  re-entry). Worked/verified: list 900, 30% sale → 630 (public), in-person → **378**.

### Admin surfaces

- `/admin/roster` — add-student form (name/email/notes/optional-expiry, optionally email the code)
  + roster list with derived status badges, copy-code, regenerate/revoke/delete (unused only).
- `/admin/roster/student/[studentId]` — per-course access-mode pills + drip release controls
  (release / un-release / "release next") + attendance rate.
- `/admin/attendance` — course tabs + roster grid (students × weeks, one-tap Attended → Absent →
  not-recorded, optimistic) + the auto-release toggle. Attendance rate also surfaced in the Phase 2
  `/admin/progress` at-risk list.
- Nav: "Roster" + "Attendance" added.

### Notifications

- `registrationCodeEmail` (optional, when an email is on the roster entry) · `lectureReleasedEmail`
  (on manual/auto drip release). Approval email unchanged (auto-approval sends none by design — the
  verify-email screen tells them they're in).

**Flagged to the user (built the default way, awaiting confirmation):** (1) **code auto-approval**
— a valid code skips manual account approval; (2) **attendance→release automation** — a toggle,
**off by default**, that releases week N's lecture to a DRIP student when they're marked Attended.

**Out of scope (per prompt):** no CSV roster import (model is import-ready), no self-service
attendance.

## 5f. Phase 5 — Per-week pricing & à la carte purchase

A student can buy a **whole course** (as before) **or a single week**, priced individually.
Additive: every existing path (manual grant, whole-course self-serve, in-person drip) is unchanged.

### Pricing model

- **`Module`** gains the same price triple as `Course`: `priceCents?`, `discountPercent?`,
  `salePriceCents?`. Every existing money helper is generic over that triple, so **sales and the
  in-person 40% stack at week level by exactly the same rule as at course level** (the private 40%
  comes off the week's current effective/sale price).
- The **course price stays independent** of the sum of its weeks — it's a bundle deal the
  instructor sets by hand, normally cheaper. Nothing auto-computes it.
- A week with a **blank/zero price is not individually purchasable** — it's full-course-only
  (`isModulePurchasable`). Set per week in the course builder's module edit form.
- New helpers in `lib/money.ts`: `isModulePurchasable`, `publicPriceCents`, `startingFromCents`
  (cheapest sellable week → the catalog line), `sumOfWeekPricesCents`, `bundleSavingCents` (only
  returns a saving when the bundle genuinely beats buying each week), and `deriveSalePricing`
  (shared list+sale → `{salePriceCents, discountPercent}` normaliser, so the course and week forms
  round-trip identically and a typed sale price never drifts).

### Access model

- **`StudentModuleAccess`** (`studentId` + `moduleId`, unique) — ownership of one week.
- **`CourseAccessMode.PER_MODULE`** (new 4th mode). **Why the course-level row still exists for a
  week-buyer:** `StudentCourseAccess` is a hard gate in ~10 places (outline, lesson viewer,
  progress/quiz/assignment APIs, dashboard listing, announcement targeting). A week purchase
  therefore still writes the course row as an **enrolment marker**, with `accessMode = PER_MODULE`
  so the *week* rows remain the thing that decides what opens. This keeps the access decision out
  of the course model without rewriting every guard.
- `getEffectiveModuleLockStates` PER_MODULE branch: a week is locked (`UNOWNED_LOCK_REASON`,
  item lock `kind: "unowned"`) unless owned. Item locks, the outline, the lesson guard and the
  player sidebar all render it as a **buy** affordance (sunny) rather than a drip/gating lock (lilac).
- `getCourseOwnership(studentId, courseId)` → `{ enrolled, wholeCourse, ownedModuleIds }`.

### Purchase & grant

- **`Purchase`** gains `scope` (`WHOLE_COURSE` | `MODULE`) + `moduleId?`. The existing price
  snapshot fields (`priceCents` / `listPriceCents` / `effectivePriceCents` /
  `inPersonDiscountApplied`) always describe **that scope**.
- `/purchase/[courseId]?module=<id>` scopes the existing InstaPay flow to one week (week title,
  week price, plus a "get the full course instead" upsell). `POST /api/purchase` re-validates the
  week server-side (belongs to the course, live, priced) and never trusts a client price.
- Approval grants exactly what was bought. `MODULE` → upsert `StudentModuleAccess` and, only when
  creating the grant, mark it `PER_MODULE` (**never downgrades** an existing whole-course or
  in-person grant). `WHOLE_COURSE` → the existing grant, and if the student was `PER_MODULE` they
  are **promoted to `GATED`** so every week (incl. future ones) opens.
- Admin queue + student history label the scope: **"Full course"** vs **"Week N — [week title]"**.

### Decisions (confirmed with the user before building)

1. **Gating vs à la carte → buying a week grants it directly.** A student who owns only week 3
   gets week 3 immediately, even though weeks 1–2 are unowned; gating can't be enforced with
   content they don't own. Gating still applies **among owned weeks** (own 1–3 → 2 locked until
   1's gating assignment is passed, 3 until 2's).
2. **A whole-course purchase covers weeks added later.** Simplest to reason about; the trade-off
   is that new weeks can't be charged for to existing owners.
3. **A week-buyer sees the full outline**, with unowned weeks locked and individually buyable
   (upsell), rather than only their own weeks.

## 5g. Landing hero — glyph clipping fix & the public preview video

### The clipped descender (root cause)

The `y` in the hero's gradient-highlighted word ("al**y**") rendered with its tail cut off. It was
**not** a font-loading fallback and **not** a parent `overflow: hidden` — measured in-browser:

- Kodchasan was rendering correctly at `font-size: 67.2px`.
- The computed `line-height` was **67.2px** (ratio 1.0). Tailwind's arbitrary `text-[…]` sizes ship
  an implicit `line-height: 1`, so `lg:text-[4.2rem]` was overriding the heading's `leading-[1.05]`.
- The font's natural glyph extent at that size is **87.5px** → the box was **20.3px too short**.

The mechanism is `background-clip: text` + `color: transparent`: a clipped background paints **only
inside the element's own box**, so glyph pixels outside it are simply never drawn. Ordinary text is
unaffected because normal glyph painting may overflow a short line box freely — which is exactly why
the bug appeared on the gradient word alone.

**Fix (in `globals.css`, on the shared `.text-gradient` / `.text-gradient-light` utilities):** grow
the paint box with `padding-block: 0.22em` and take the same amount back with `margin-block:
-0.22em`. Verified: paint box 67.2 → 96.8px (covers the 87.5px extent), and `h1`/section heights are
byte-identical before and after (0.00px delta), so line rhythm is untouched. Fixing the utility also
fixed the **same latent bug** in `cta-banner.tsx` ("Ni**g**ht Before." — 48px box vs 62px extent).

### Hero preview video (public marketing asset)

- **`components/landing/hero-player.tsx`** — a real `<video>`: click-to-play/pause, working seek
  (click or ←/→ on the progress bar), a progress bar bound to `timeupdate`, mute toggle, and a
  functional Rewatch. Muted autoplay when it scrolls into view (IntersectionObserver, pauses when it
  leaves); **no autoplay at all under `prefers-reduced-motion`**.
- **Deliberately unprotected.** This is public marketing, not course content: no watermark, no
  download blocking, no single-session check, no gating. It only borrows `VideoProvider` for
  upload/streaming mechanics, so swapping hosts later changes nothing. Course-video protection is
  untouched.
- **Placeholder, never a broken player.** With nothing uploaded, the hero renders the original
  static mock (`getHeroVideo()` returns null, and also returns null if the object is unreadable, so
  a bad asset can't take the landing page down).
- All hero marketing chrome is unchanged: the "Assignment passed — Week 3 unlocked" toast, the
  "Databases · Exam prep" caption, the "92%" badge, and the "Kept up all semester" callout.

### Admin: Site settings

New **`/admin/settings`** ("Site settings", gear icon in the admin rail) with one card: **Landing
page hero preview video** — upload a video (≤200 MB) plus an optional poster (≤5 MB), with the
Phase 2 video status pattern (no-video / processing / **Ready**) and a Remove action that restores
the placeholder. Backed by `POST /api/admin/hero-video`.

**Data model:** the asset lives on `Instructor` (same place as the InstaPay settings — the
established home for admin-configurable singletons): `heroVideoProvider`, `heroVideoAssetId`,
`heroVideoStorageKey`, `heroVideoStatus`, `heroVideoFilename`, `heroPosterAssetId` → `FileAsset`.
Deliberately **not** a `Video`/`LessonItem` row: it has no course, no module, and no gating.
Migration `hero_preview_video`.

## 5h. Per-module pricing — why it looked broken, and upgrade credit

### Root cause: the field worked, but was invisible

Reported as "I can't set a price per module at all." It was **not** a wiring bug and **not** shared
state. Verified end to end in the browser: the input exists per module, is editable (not
disabled/read-only), is populated with that module's own value, submits `moduleId` + `price`, and
persists — a typed `1777` landed as `priceCents: 177700`.

The failure was **discoverability**:

1. A collapsed module card rendered only `"Week 1 — … Published"` — **no price at all**. A priced
   week and an unpriced week were visually identical, so nothing indicated the feature existed or
   which weeks were already priced.
2. The only way in was an unlabeled pencil among five identical icon buttons, titled generically
   "Edit module" — nothing suggested pricing lived inside it.
3. Meanwhile the large, obvious field at the top of the same page said **"Price (EGP)"** and
   belonged to the *course*. Anyone trying to price a week naturally used that one, watched it apply
   to the whole course, and concluded per-week pricing didn't work.

**Fix:** show the price on the collapsed card (`ModulePriceBadge` — `EGP 850`, a struck sale pair,
or `Full course only`); add an explicit labelled **Price** button per week beside the pencil; rename
the course field to **"Full course price (EGP)"** and point it at the per-week control.

### Bug found by the end-to-end test: upgrades were blocked

`/purchase/[courseId]` and `POST /api/purchase` both treated *any* `StudentCourseAccess` row as
"already owns this course". A `PER_MODULE` student holds such a row purely as an **enrolment
marker**, so a week-buyer was redirected away from the whole-course checkout and could never
upgrade. Both guards now check `ownership.wholeCourse` instead.

### Upgrade credit

`lib/upgrade-credit.ts` — `getModuleCredits()` / `quoteCourseUpgrade()`.

- Credit = the sum of what the student **actually paid** (`Purchase.priceCents`) for **APPROVED**
  `MODULE` purchases in that course. Pending and rejected purchases are excluded (no money
  received), and paid-amount is used rather than current list price so later price edits can't
  retroactively change the credit.
- Order of operations: **sale → in-person 40% → minus prior payments**, floored at zero.
- Shown before paying on the checkout page (an itemised "Week N — title −EGP X" list and a
  `full course − paid = due` line) and teased on the catalog rail.
- `Purchase.priorCreditCents` (migration `upgrade_credit`) makes a reduced charge auditable
  alongside `listPriceCents` / `effectivePriceCents` / `inPersonDiscountApplied` / `priceCents`;
  the admin queue shows "after −EGP X already paid for weeks".

**Over-credit is real, not hypothetical.** With the current CS3 pricing the bundle is EGP 2,000
while the priced weeks total EGP 3,977 — buying just W1 + W2 (1,777 + 850 = 2,627) already exceeds
it. The upgrade is floored at zero and flagged in the UI, but the underlying pricing invites
students to overpay piecemeal; the week prices should be set so a plausible combination stays under
the bundle, or the bundle nudge should appear earlier.

## 5i. Icon rail — shared dock component

`components/icon-rail.tsx` is now the **single** implementation of the left rail, used by both
`StudentRail` (`components/student-rail.tsx`) and `AdminRail` (`components/admin-rail.tsx`). Each
only supplies its own nav items; the markup, tooltips, magnification and mobile bar live in one
place. `app-shell.tsx` no longer carries a second copy of the rail or the nav table.

- **Tooltips** — every icon (including Sign out) shows its label to the right on hover *and*
  keyboard focus. Pure CSS (`group-hover` / `group-focus-within`) with an **enter-only** delay: the
  base state carries `delay-0` and the hover state `delay-300`, and CSS applies the *target* state's
  delay, so it eases in after a beat and vanishes instantly on leave. No React render on hover.
- **Magnification** — one `requestAnimationFrame` loop writes `transform` straight to the DOM from
  the cursor's distance to each icon: hovered icon **1.42×**, immediate neighbour **1.21×**, back to
  **1.0** two icons out. No React state, so a mouse sweep triggers **zero** re-renders. The loop only
  runs while the cursor is over the rail plus a short settle, then clears the inline transforms.
- **No reflow** — we scale via `transform`, not width/height, so layout is never dirtied: nothing
  inside or outside the rail shifts, and the 10-item admin rail can't overflow its own height. The
  magnified icon also nudges ~7px right so it leans out of the rail.
- **Opt-outs** — `prefers-reduced-motion` and pointer-less devices (`(hover: hover) and
  (pointer: fine)`) skip magnification entirely; the handlers aren't even attached, so the loop
  never starts. Tooltips still work in both cases (focus-driven on touch).
- The active page keeps its `bg-sunny` fill and magnifies along with the rest.

**Verification note:** the falloff is exported as a pure `dockScaleFor(distancePx)` and unit-tested
(max at the cursor, symmetric, monotonic taper, clamped to [1, 1.42]) **because the animation itself
can't be observed in the preview pane** — it reports `document.visibilityState === "hidden"`, where
Chrome suspends `requestAnimationFrame` entirely (0 ticks in 500ms). That also suppresses any
rAF-driven library animation, which is the same reason the hero video can't be seen playing there.

## 5j. Telegram alerts for the instructor

A **second** notification channel alongside the existing student emails — not a replacement. Emails
still go to students exactly as before; Telegram messages go only to Megz.

- **`lib/telegram/index.ts`** — `sendTelegramMessage(text)`, mirroring the `sendEmail()` seam.
  Posts to `https://api.telegram.org/bot<TOKEN>/sendMessage`. It is **strictly best-effort**: a
  missing config, bad token, rate limit, or Telegram outage is logged and swallowed, never thrown,
  so it can't break a registration or a checkout. A 5s `AbortSignal.timeout` stops a hanging
  Telegram request from holding a student's request open.
- **`lib/telegram/templates.ts`** — one fixed template per event, each ending in a deep link to the
  admin page that needs attention.

### Triggers

| Event | Fires | Message |
| ----- | ----- | ------- |
| Student registers | `register/actions.ts`, at **account creation** (before email verification), immediately before the `redirect()` that unwinds the request | `🆕 New signup: **<username>** (email) / university — in-person code \| normal registration` + link to `/admin/students` |
| Purchase submitted | `POST /api/purchase`, at **submission** (not approval) — the point is flagging that the queue needs you | `💳 New purchase pending: **<username>** / Full course: X \| Week N of X — Y / **EGP …** — awaiting your review` + link to `/admin/payments` |

### Env

```
TELEGRAM_BOT_TOKEN   # @BotFather → /newbot → copy the token
TELEGRAM_CHAT_ID     # message the bot, then read result[0].message.chat.id
                     # from https://api.telegram.org/bot<TOKEN>/getUpdates
```

Both optional and documented in `.env.example`. If **either** is unset the app runs normally and
logs `[telegram] not configured … — skipping`.

**Formatting note:** messages are sent with `parse_mode: HTML`, not Markdown. Telegram's legacy
Markdown has unreliable escaping and its special characters appear constantly in real data (an `_`
in a student email, a `-` in "… - CS3"), which would make Telegram reject the whole message — and a
silently dropped alert defeats the purpose. HTML needs only `& < >` escaped, renders the same bold,
and can't be broken by a realistic name or course title.

## 5k. Decoration layer — REMOVED (2026-09-19)

The coding-motif sticker/doodle layer (`src/components/decor/`) has been **deleted**, not disabled.
It was only ever applied to the landing hero; catalog, dashboard and empty states never received it.

**Why.** The original spec required decoration to sit strictly behind content and never overlap real
text. In use it did overlap — a mint sticker landed on the "GUC & GIU students" line. The
geometric verification done at build time (0 overlaps at 1440/1280/768/375) checked those four
widths only, and the side-anchored items were gated on `min-[1340px]`, which leaves just ~22px of
clearance at 1340 and less once a scrollbar narrows the layout below the media-query width. The
constraint could not be held cheaply, so the feature went rather than getting repositioned.

**Note for anyone re-reading the old bug report:** the *purple* wash near the headline is **not**
this layer. It is the pre-existing `<Glow>` blobs in `components/landing/backdrop.tsx`
(`bg-lilac/40`, `bg-sunny/40`, `bg-sky/30`), which are part of the hero's intended background and
paint *behind* the copy (verified: content is `relative`, so it stacks above). Those remain.

## 5l. Launch-video asset capture (`pnpm capture-assets`)

Scripted Playwright capture of a small, curated set of product footage for a 20-second launch
video. Five hero shots only — a full asset library would be noise at that length.

```bash
cp .env.capture.example .env.capture   # point DATABASE_URL at a LOCAL Postgres
docker compose up -d                   # or any local Postgres on 5432
pnpm capture-assets                    # migrate → seed → build → capture → transcode
pnpm capture-assets --skip-build       # reuse the existing .next build
```

| File | Role |
| ---- | ---- |
| `capture/demo-data.ts` | Fictional demo content (Megz + CS1/CS2/CS3, one student, progress, one graded submission). |
| `capture/capture.ts` | The five shots. Stills + Playwright recordings. |
| `capture/run.ts` | Orchestrator behind the one command. |
| `.env.capture.example` | Capture-only env. **Never** the Supabase URL. |

Output lands in `launch-video-assets/` (gitignored) with a generated `README.md`.

### Safety rail

The seed **deletes content rows**, and the project's real `DATABASE_URL` is a live Supabase
instance. `assertLocalDatabase()` therefore refuses to run unless the URL's host is localhost /
127.0.0.1 / a docker-internal name, and the runner loads `.env.capture` rather than `.env` so a
stray shell export can't redirect it. This is the single most important line in the whole feature.

### Capture decisions

- **2560×1440**, as a 1280×720 CSS viewport at `deviceScaleFactor: 2` — real device pixels at a
  normal desktop layout, rather than a 2560-wide layout that renders sparse and tiny.
- **Production build, not `next dev`** — no dev overlay, no route recompiles mid-take.
- **No browser chrome at all**: Playwright records the page surface only.
- **No cursor in any recording.** Playwright doesn't paint one, and a drawn-on fake pointer reads
  worse than clean UI in a fast cut. The clicks and scrolls are real; only the pointer is absent.
- **The unlock shot flips real state**, not a mock: it marks the Week-1 gating submission passed via
  the `Submission` model and reloads, so the lock genuinely lifts through `getItemLock`.
- Scrolling is an eased `requestAnimationFrame` tween, not wheel events — repeatable and smooth.

### Known gaps (deliberately not faked)

- **There is no streak or badge UI.** `StudentStreak` exists in the schema but nothing in `src/`
  reads `currentStreak` — the only occurrence of "streak" in the app is copy ("keep the streak
  going"). Shot 4 therefore captures what does exist: course cards with part-filled progress, the
  next-lessons table, and the "continue where you left off" panel. Building a streak component for
  the video would advertise a feature that doesn't ship. The streak rows are seeded anyway, so the
  shot works the day a streak UI lands.
- **The catalog has no filter pills** — `CourseFilterGrid` (pills) is on the *dashboard*. Shot 5 is
  a catalog scroll; the pill interaction is recorded on the dashboard, where it is real.
- **The lecture video is a placeholder** (an abstract brand-coloured gradient) unless a real
  recording is placed at `capture/assets/lecture.mp4`, which the seed prefers automatically. It is
  deliberately abstract rather than invented "lecture" content.
- **60fps is frame duplication**, not interpolation: Playwright's screencast runs at ~25fps and
  ffmpeg re-times it. The files cut cleanly into a 60fps timeline but shouldn't be slowed below
  ~40%.

## 5m. Launch film (Remotion) — lives OUTSIDE this repo

The 20-second launch video is a **separate project**, deliberately not inside the Next.js app:

```
/Users/magouza/Desktop/cohort-portal-launch-video
```

```bash
cd ~/Desktop/cohort-portal-launch-video
pnpm dev                  # Remotion Studio, live preview
pnpm render               # → out/cohort-portal-launch.mp4
node scripts/embed-font.mjs   # regenerate the embedded Inter Tight
```

Composition `LaunchFilm`: 1920×1080, 30fps, **600 frames = 20.0s exactly**. One file per scene
(`src/scenes/S1…S7`), boundaries in `src/theme.ts` mirroring the voiceover script, so a scene can be
iterated without touching the rest.

Footage is copied from `launch-video-assets/` into `public/footage/` — only real captured UI, never
a recreation.

### Things worth knowing before touching it

- **Voiceover is not generated** (`remotion-superpowers` isn't installed), but adding audio needs
  **no code edit**. `scripts/audio-manifest.mjs` scans `public/audio/` and regenerates
  `src/audio-manifest.ts`; it is chained into `pnpm dev` and `pnpm render` explicitly, because
  pnpm 10 does not run `pre`/`post` scripts. Recognised files:
  - `vo-1.mp3` … `vo-7.mp3` — one clip per script line, each pinned to its cue frame
    (0 / 90 / 150 / 240 / 330 / 450 / 570). **Preferred**: a single track drifts against the cuts
    the moment a line runs long or short.
  - `voiceover.mp3` — fallback, one full-length narration track.
  - `music.mp3` — underscore, ducked to 0.04 for frames 430–456 so the 0:15 card lands.
  Any of `.mp3/.wav/.m4a/.aac/.ogg`. **Verified** by rendering frames 0–90 with generated tones in
  place: output carried a real AAC stream at the expected bed level, then the test files were removed.
- **TypeScript must stay on 5.x.** pnpm resolved `typescript@7` by default, whose API drops
  `ts.sys`; Remotion's esbuild loader calls `ts.sys.readFile` and dies at bundle time.
- **Use `OffthreadVideo`, not `<Video>`.** With `<Video>` the render reliably died around frame 440
  with an uncleared `delayRender()` — the font handle tripping a timeout under video-element
  contention. `OffthreadVideo` renders clean.
- **The font is embedded as a data URI** (`src/font-data.ts`, generated). Loading it from
  `staticFile()` timed out mid-render once several workers requested it at once.
- **Renders need `--timeout=90000`.** Default 28s is too tight for the video-heavy scenes.
- The `Panel` component takes an explicit `height`; letting the media size the box left the panel
  larger than the frame it contained.

### Deviations from the brief, and why

- **The 0:15 card breaks onto FOUR lines**, not two. The words are exactly the script's. On two
  lines the longest run is 19 characters, which caps the type at ~150px to fit 1920 — *smaller* than
  the conversational cards, which defeats a beat whose whole point is being the largest type in the
  film. Four short lines run at 256px and fill the frame both ways.
- Type is oversized throughout, per the user's explicit choice. Noted at the time that the reference
  film actually keeps most cards modest and reserves oversized type for two hero beats; the user
  confirmed they wanted the louder treatment.

## 5n. Video — Bunny Stream

`VIDEO_PROVIDER=bunny` in production, `local` in development (disk + `<video>`, no credentials
needed). Selected in `resolveVideoProvider()`; the lesson page branches on
`videoProvider.playback` (`"file"` vs `"iframe"`), never on the provider name.

### ⚠️ The upload path bypasses the server ON PURPOSE — do not refactor it back

Lecture files are ~2 hours. Their bytes **must never pass through a serverless function**: Vercel
caps wall-clock at 10s (Hobby) / 60s (Pro) and memory well below a multi-GB file. So
`bunnyVideo.upload()` **throws by design**, and the real path is:

| Step | Where | Cost |
| ---- | ----- | ---- |
| 1. Create the empty video object, mint a TUS signature scoped to that GUID + expiry | server (`POST /api/admin/video/direct-upload`) | milliseconds |
| 2. Stream the bytes | **browser → Bunny**, TUS resumable | no server involvement |
| 3. Report outcome, then poll transcoding | server (`/api/admin/video/status`) | milliseconds |

The API key never reaches the browser — only a SHA256 signature over
`libraryId + apiKey + expiry + videoId`, valid for one video. TUS means a dropped connection on a
multi-GB file resumes instead of restarting. Every function call stays in the milliseconds, so
Vercel's timeout is irrelevant regardless of plan.

### Upload state machine (no lesson can wedge in "processing")

| `Video.status` | Meaning | Admin sees |
| -------------- | ------- | ---------- |
| `PENDING` | object created, bytes never arrived (tab closed mid-upload) | "Upload never finished" + Retry |
| `PROCESSING` | bytes delivered, Bunny transcoding | "Processing — N%" |
| `READY` | playable | "ready" |
| `ERROR` | browser upload failed, or Bunny reported Error/UploadFailed | error + Retry |

Bunny's numeric status maps as **0 Created · 1 Uploaded · 2 Processing · 3 Transcoding ·
4 Finished · 5 Error · 6 UploadFailed · 7 JitSegmenting · 8 JitPlaylistsCreated**, taken from the
API reference. A widely-repeated blog claim that "3 = Finished" is **wrong** and would leave every
lesson stuck transcoding.

### Playback and protection

Bunny's embedded player in an iframe, via a token-authenticated URL
(`SHA256(tokenKey + videoId + expiry)`, passed as `?token=&expires=`) so copied links expire.
Progress tracking survives the swap: Bunny supports **player.js** over postMessage, so
`components/bunny-player.tsx` still reports position / watched % / completion to `/api/progress`
exactly as the old `<video>` did. Completion, dashboard percentages and assignment gating are
unaffected.

**The per-student watermark was removed, deliberately** (instructor's decision, 2026-09-19): a
leaked lecture is treated as marketing, not loss. Bunny has no per-viewer dynamic watermark anyway
— only a static library-wide logo applied at encode time — so the overlay would have had to be
re-implemented over the iframe. It wasn't. The PDF viewer's watermark is untouched.

Protection is now Bunny's rather than ours: expiring signed embeds, referrer/domain allowlisting
(configured on the library, not in env), and the player's download control.

## 6. Decisions Log

| Date       | Decision / Change                                                                 | Reason |
| ---------- | --------------------------------------------------------------------------------- | ------ |
| 2026-08-13 | **Launch film built in Remotion (see §5m).** New standalone project at `~/Desktop/cohort-portal-launch-video` — deliberately outside this repo, since it's a video pipeline, not product code. 1920×1080 / 30fps / 600 frames = 20.0s exactly, seven scene files, footage copied from `launch-video-assets/`. | Reference film analysed first (probe + scene detection + contact sheets + a frame-by-frame strip) and observations confirmed with the user before building. **Bug found in the capture pipeline while compositing:** the MP4s were a 2560×1440 canvas with the page rendered at only 1280×720 in the top-left and grey elsewhere — Playwright's `recordVideo.size` sets the output canvas but does **not** scale the screencast by `deviceScaleFactor`, so a bigger canvas just pads the frame. I had reported the recordings verified to spec on the strength of ffprobe container dimensions, having only checked content on the stills; that was an overclaim, now corrected — recordings are re-captured 1:1 at 1920×1080 and §5l updated. Three wrong guesses preceded finding it (objectFit, explicit panel height, bundle cache), each disproved by re-render before moving on. Also: TypeScript pinned to 5.x (v7 drops `ts.sys`, which Remotion's esbuild loader calls); `OffthreadVideo` not `<Video>` (the latter killed renders at ~frame 440 with an uncleared `delayRender`); font embedded as a data URI (staticFile fetch timed out under worker concurrency); renders need `--timeout=90000`. **Deviation flagged:** the 0:15 card breaks onto four lines rather than the briefed two — same words, but two lines cap the type at ~150px to fit 1920, i.e. smaller than the conversational cards, defeating the point of the largest-type beat. **Voiceover not generated** (`remotion-superpowers` absent); `<Audio>` is wired and gated behind a flag with the music duck already timed. |
| 2026-08-13 | **Launch-video asset capture (see §5l).** New `capture/` (demo-data, capture, run) + `pnpm capture-assets`, driven by Playwright against a production build on a **local** Postgres seeded with fictional demo content. Five hero shots (lesson player, unlock moment, assignment→feedback, dashboard progress, catalog), stills at 2560×1440 plus 4s 60fps MP4s and transparent-background element exports. New dev deps: `@playwright/test`, `ffmpeg-static`. | The seed deletes content rows and the real `DATABASE_URL` is live Supabase, so the runner reads `.env.capture` (never `.env`) and `assertLocalDatabase()` hard-refuses any non-local host — the one line that matters most here. 1280×720 CSS at 2× DPR rather than a literal 2560 viewport, so the layout stays a normal desktop layout at real device pixels. Production build, not `next dev`, to keep the dev overlay and route recompiles out of the footage. The unlock shot flips the actual `Submission` to passed and reloads, so the lock lifts through the real `getItemLock` path instead of a mock. **Three gaps flagged rather than faked:** there is no streak/badge UI at all (`StudentStreak` is schema-only; nothing in `src/` reads `currentStreak`), so shot 4 captures the progress UI that does exist; the catalog has no filter pills (they're on the dashboard), so the pill interaction was recorded where it's real; and the lecture clip is an abstract placeholder unless a real recording is dropped at `capture/assets/lecture.mp4`. **Verified:** Playwright emits true 2560×1440 stills at `deviceScaleFactor: 2`, ffmpeg-static and the `gradients` filter both run, and the whole capture path typechecks. **Not yet run end-to-end** — no local Postgres was available (Docker daemon down, Postgres.app not started). |
| 2026-08-11 | **Decoration layer: coding-motif stickers & doodles (see §5k).** New `components/decor/` — `glyphs.tsx` (7 sticker tiles, 6 doodles, 1 block arrow, all inline SVG), `scenes.ts` (authored placements as plain data), `decor-layer.tsx` (positioning + scroll parallax). Applied to the landing hero only so far. Nothing else touched: no layout, copy, routes or behaviour. | Built as a composable library rather than fixed images so each section can be art-directed separately, and inline SVG so it costs no requests and no raster weight. **Authored placements, not random** — a random scatter reliably lands on a headline, and the carousel style depends on negative space around each element. Margin items are anchored to the *content column* (`calc(50% + 576px + gap)`), not a viewport %, because a viewport-% margin element creeps onto the copy as the window narrows — which it demonstrably did at 1024 before the change. **Flame is excluded from the whole library** by design: the kit reserves flame for clickable things, and decoration is never clickable. **Verified:** 0 overlaps against every real hero element and 0 off-screen clipping at 1440 / 1280 / 768 / 375 (10 / 5 / 3 / 2 elements shown); three genuine collisions found and fixed en route (the "calm." ghost's `-right-6` spill, the float chip's `-right-8` spill, and the pre-anchoring margin set landing on the headline at 1024). **Not verified:** the parallax drift itself — the preview pane suspends `requestAnimationFrame`, same environmental cause as §5i. |
| 2026-08-03 | **Telegram alerts for the instructor (see §5j).** New `lib/telegram` seam mirroring `sendEmail()`: `sendTelegramMessage()` + one fixed template per event, each deep-linking to the admin page that needs attention. Fires on **account creation** (`register/actions.ts`, before the `redirect()` that unwinds the request) and on **purchase submission** (`POST /api/purchase`, not on approval). New optional `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, documented in `.env.example` with the @BotFather and `getUpdates` steps. Student emails untouched. | Additive channel for the admin only. Best-effort by construction — unset creds log "not configured" and skip; a failed send is logged and swallowed; a 5s timeout stops Telegram stalling a student's request. **Deviation flagged:** sent as `parse_mode: HTML` rather than Markdown as specified — Telegram's legacy Markdown escaping is unreliable and its special chars are everywhere in real data (`_` in emails, `-` in "… - CS3"), which would make Telegram reject the message entirely; a silently dropped alert defeats the point. HTML escapes only `& < >` and renders the same bold. **Verified:** 19/19 template assertions (bold key detail, in-person vs normal signup, full-course vs "Week N of …", correct charged amount, admin deep links, HTML injection escaped, markdown-special chars left unmangled) and the unconfigured path skipping cleanly; resilience proven against the **real** API with a bogus token — 401 logged and swallowed, caller unaffected (989ms). Two initial test failures were my own assertions using a plain space where `Intl.NumberFormat` emits U+00A0, not a code defect. |
| 2026-08-03 | **Icon rail: shared macOS-Dock component (see §5i).** Extracted `components/icon-rail.tsx` as the one implementation of the left rail; `student-rail.tsx` and `admin-rail.tsx` now just supply nav items, and `app-shell.tsx` lost its duplicate rail + nav table. Adds label tooltips on hover/focus for every icon and cursor-distance magnification (1.42× hovered, 1.21× neighbour, 1.0 two out, +7px lean), disabled under `prefers-reduced-motion` and on pointer-less devices. Nav logic, routes and per-role icons untouched. | Built on a raw rAF loop writing `transform` directly rather than Framer springs: no React state means zero re-renders on a mouse sweep, and animating `transform` (not width/height) keeps layout clean so nothing reflows and the 10-item admin rail can't overflow. Tooltips are CSS-only with an enter-only delay, so hovering never renders. **Verified:** student rail 6 tooltips / admin rail 11, all labelled correctly, magnification handlers attached on both, active icon keeps `bg-sunny`; falloff exported as pure `dockScaleFor()` and unit-tested 8/8 (max at cursor, symmetric, monotonic, clamped). **Could not observe the animation itself:** the preview pane runs with `document.visibilityState === "hidden"`, where Chrome suspends `requestAnimationFrame` (measured 0 ticks/500ms) — this also explains why the hero video never appeared to play there. Earlier diagnoses in this session that blamed NaN poisoning, Framer `style` binding and `useMotionValueEvent` were wrong; all three symptoms were this one environmental cause. |
| 2026-08-03 | **Per-module pricing discoverability fix + upgrade credit (see §5h).** Root cause of "can't set a module price" was **not** wiring or shared state — the save path works (proved: typed `1777` → `priceCents 177700`). The price was simply **invisible**: collapsed module cards showed no price, the only entry point was an unlabeled pencil titled "Edit module", and the page's prominent "Price (EGP)" field is the *course* price. Added a per-week price badge on the card, an explicit **Price** button, and renamed the course field to "Full course price (EGP)". Built upgrade credit (`lib/upgrade-credit.ts`, `Purchase.priorCreditCents`, migration `upgrade_credit`): approved module purchases are credited (at amount paid) against the course price, after sale and in-person stacking, floored at zero, itemised for the student and auditable for admin. | **Also found and fixed a real blocker while testing:** both the checkout page and `POST /api/purchase` treated any `StudentCourseAccess` row as full ownership, so a `PER_MODULE` student (whose row is only an enrolment marker) was redirected away and **could never upgrade at all**; both now check `ownership.wholeCourse`. **Verified:** 3 distinct week prices (1,777 / 850 / 640-sale-500) saved through the real admin UI and confirmed by a fresh DB fetch, with W4/W5 correctly null; admin cards render each price; catalog shows "Starting from EGP 500" (the genuinely cheapest week); 11/11 credit assertions against the live DB (pending and rejected excluded, credit = amount paid, in-person 2,000→1,200 then −500 = 700, over-credit floors at 0 and flags, no cross-course leakage); checkout rendered "Full course EGP 2,000 − EGP 850 already paid = EGP 1,150". **Over-credit confirmed possible with current prices** (weeks total 3,977 vs 2,000 bundle). **Not verified — Supabase went down mid-test:** submitting the upgrade purchase through the API and approving it, i.e. that `priorCreditCents` persists on a real record and that approval grants full-course access without duplicating the owned week. |
| 2026-08-03 | **Hero glyph-clipping fix + real public preview video + Site settings (see §5g).** Fixed the cropped `y` in the hero's gradient word by padding the `.text-gradient` paint box (`padding-block: .22em` / `margin-block: -.22em`); same change fixed the identical latent bug in `cta-banner.tsx`. Made the hero's mock player real (`hero-player.tsx`): true playback, seek, live progress bar, mute toggle, Rewatch, muted autoplay-in-view that is disabled under `prefers-reduced-motion`. Added `/admin/settings` → "Landing page hero preview video" (upload + optional poster, Ready status, Remove) via `POST /api/admin/hero-video`, stored on `Instructor` (migration `hero_preview_video`). | **Root cause was measured, not guessed:** Kodchasan was loading fine and no parent had `overflow:hidden` — the box was 67.2px against an 87.5px glyph extent (Tailwind's arbitrary `text-[4.2rem]` ships `line-height: 1`, overriding `leading-[1.05]`), and `background-clip: text` paints only inside that box. Verified the fix covers the extent (96.8px) with a **0.00px** layout delta on both `h1` and the section. The hero video is public/unprotected **by design** — course watermarking, download-blocking and gating are untouched; it borrows only the VideoProvider upload/stream path, and is stored on `Instructor` (like the InstaPay settings) rather than as a `Video`/`LessonItem` since it has no course. **Verified end-to-end:** uploaded through the real admin UI → status "Ready" → landing page served `/api/media` to an **anonymous** visitor (readyState 4, 960×540, no error), seek-to-75% set `currentTime` to 1.49s of 1.99s exactly, progress bar tracked `timeupdate`, and removing the asset returned the hero to the static mock with no `<video>` rendered. **Not provable in this environment:** visible frame-by-frame autoplay — the preview pane reports `document.visibilityState === "hidden"`, and Chrome suspends media playback in hidden documents. |
| 2026-08-03 | **Phase 5 — per-week pricing & à la carte purchase (see §5f).** `Module` gains the course price triple (`priceCents`/`discountPercent`/`salePriceCents`) so sales + the in-person 40% stack identically at week level; course price stays an independent bundle. New `StudentModuleAccess` + `CourseAccessMode.PER_MODULE`; `Purchase` gains `scope` + `moduleId` and snapshots the price for that scope. Catalog gains "Starting from EGP X / week"; course detail lists each week with its price and "Buy this week" (or "Included in full course") plus a "save EGP Y" bundle line; checkout is scoped via `?module=`; approval grants the right scope and promotes a week-buyer off `PER_MODULE` when they later buy the bundle. Admin queue + student history label scope ("Full course" vs "Week N — title"). Migration `module_pricing_and_access`. | **Key structural finding:** `StudentCourseAccess` is a hard `notFound()` gate in ~10 places, so a week-buyer with no course row would be locked out entirely (and the course wouldn't even list on their dashboard). Resolved by keeping the course row as an **enrolment marker** with the new `PER_MODULE` mode, leaving the *what-opens* decision in `StudentModuleAccess` — no guard rewrites. **Three product decisions confirmed with the user first:** (a) buying a week grants it directly regardless of unowned prior weeks, with gating still applying among owned weeks; (b) a whole-course purchase covers weeks added later; (c) week-buyers see the full outline with unowned weeks locked + buyable. **Verified:** 16/16 pricing assertions (week sale 1,200→1,000; in-person stacking 1,200→720 and sale→600; exact typed sale price doesn't drift; bundle saving suppressed when not real) and 6/6 access-matrix assertions against the real `getEffectiveModuleLockStates` (owns-W3-only → only W3 open; owns W1–W3 → gating chain restored as W1 is passed; whole-course unaffected). **In-browser end-to-end:** catalog "Starting from EGP 1,000 / week" (absent on whole-course-only courses); detail page showing Owned / Under review / Buy this week / Included-in-full-course across four weeks + "save EGP 1,400"; outline with W3 open beside locked+buyable W1/W2; scoped checkout charging EGP 1,200 with the full-course upsell; admin queue showing "Week 1 — …" then "Full course"; approving each and confirming the DB (`PER_MODULE` + W1&W3 owned → then promoted to `GATED`, `extrasUnlocked`). |
| 2026-07-14 | **Old-palette cleanup — legacy design system fully retired.** Removed the dead legacy tokens from `tailwind.config.ts` (core `sage/moss/bark/cream/fog`, accents `clay/amber/mist/rust/fern`, the `brand.*` map), the old gradient `backgroundImage` set (`energy/sunset/arch-warm/arch-fresh`), the `shadow-glow`/`glow-gold`/`raised` scale, and the `rounded-arch` radius; re-tinted the surviving `shadow-hairline`/`lift` from bark-green rgba to ink. Swept the last old-palette CSS classes across admin internals (roster/attendance/payments/progress/grading/announcements — their section-header icons became chunky `rounded-2xl` card-fill tiles: sky/mint/sunny/lilac/flame) and in `markdown`/`code-block`/`copy-code`/`onboarding-steps`/`progress-bar`(`tone "energy"→"flame"`)/`badge`/`ui/card`/`sale-badge`/`catalog preview` (bark→ink, cream→white, moss→flame, sage/amber→sunny). Deleted now-dead components `logo.tsx`, `app-header.tsx`, `student-nav.tsx`, `theme-toggle.tsx`, and the stale `.dark` block in `globals.css` (dark mode is force-off in RootLayout). Deleted the superseded §5c palette docs. | Follow-through on the "remove old palette tokens once every screen is migrated" item. Landing files `feature-showcase.tsx`/`proof.tsx` keep old *names* only as internal JS lookup keys that already map to new color classes (no old colors render), so left as-is. **Verified:** `build` (30 routes) clean, no warnings; public landing rendered in-browser on the new palette (flame CTA, sunny/sky/lilac glow blobs, no old green) with no console errors. Admin pages weren't logged into (auth flaky) but every changed class compiled in the build. |
| 2026-07-14 | **Admin left icon rail + dashboard layout matched to the reference.** Admin now uses a left icon rail (new `components/admin-rail.tsx`, client, `usePathname` active-highlight over the 9 admin sections + logout) instead of the top nav — `admin/layout.tsx` rewritten with a rail + wordmark/avatar top bar. Dashboard restyled to mirror the reference: `CourseFilterGrid` (client) adds "My courses" + **category filter pills** (by university — the only real category field we have), a 3-up card row, then a **next-lessons table** (Lesson / Teacher / Duration, teacher initials avatar) beside a dark "continue" promo card. `CourseCard` became a client component (for the filter grid) so the `CARD_FILLS`/`CardFill` constants moved to a plain `lib/card-fills.ts` (a server component can't read runtime values from a client module). | User: "admin should have the left menu bar instead of the top one; match the screenshots." **Verified in-browser** (admin rail + dashboard at desktop width). **Conscious deviations from the reference:** (1) card bottom-left keeps the lessons-left indicator, not a fabricated enrolled-peer avatar stack (earlier user decision + privacy/no data); (2) only one filter category surfaces because our courses have no subject taxonomy; (3) the lesson player's Description/Materials/Home-task tabs were NOT added — our content is per-lesson-item (a lesson is a video OR doc OR assignment, not a bundle), so those tabs don't map. `typecheck` + `build` (30 routes) clean. |
| 2026-07-14 | **Design overhaul rollout (post-approval).** Applied the new "bold friendly" system (§5c′) across the authenticated app + public funnel: built the **course bookmark** feature (`SavedCourse` model/migration + action + optimistic button) and a **lessons-left** card indicator (replacing the reference's fabricated peer-avatar stack); rebuilt the **lesson player** two-column (breadcrumb, stat chips, flame play affordance, **chapters** — new `LessonItem.chapters` field + admin textarea + in-player seeking, migration `saved_courses_and_chapters` — and a module-accordion sidebar keeping all locked/paid treatments); restyled the course outline, announcements, purchases, account, purchase/checkout, catalog + preview, public header, auth layout; gave admin a new header/shell; repointed the **shadcn Button** app-wide (was still the old green `bg-energy`) to flame pills. All business logic / gating / drip / pricing / protection untouched. | User approved the foundation and said "go". **Verified in-browser:** dashboard (cards + bookmark + lessons-left), lesson player (protected watermarked doc + highlighted accordion), catalog (block-colour cards), course outline, admin (flame buttons). `typecheck` + `build` (30 routes) clean. **Remaining:** deeper landing sections + minor admin-internal old-palette bits (tracked in §5c′); old palette tokens kept until then. |
| 2026-07-12 | **Design-system overhaul — foundation slice (in progress; awaiting sign-off before full rollout).** New visual language: bold/friendly/high-contrast, chunky-rounded, saturated block-color cards on an off-white canvas. **Type:** switched from Fredoka+Jost to a single **Kodchasan** family (weight-differentiated). **Palette (replaces sage/moss/bark/cream/fog):** `ink #151313`, `flame #FF5734` (primary), `lilac #BE94F5`, `sunny #FCCC42`, `paper #F7F7F5`, `white`, plus two sibling card fills `sky #73C2FB` + `mint #7FD9A6`. Semantic tokens repointed: success→grass green (white-legible), warning/highlight→sunny, **danger→a distinct berry red `#E23744`** (NOT flame — flame is the primary action colour, so reusing it for danger reads as confusing; introduced a separate red per the brief's escape hatch), info/locked→lilac. Repointed all shadcn CSS vars in `globals.css` (bg=paper, card=white, primary=flame, radius=1rem). Radii up (`rounded-card` 22px, pill buttons); mostly flat + crisp 1px borders, `shadow-soft` only on floating elements. **Built:** `components/app-shell.tsx` (floating ink icon rail → mobile bottom bar; top bar with wordmark, search, bell, avatar), `components/course-card.tsx` (saturated fill cycling sunny/lilac/sky/mint, category pill, bookmark, ink progress bar, flame CTA). **Applied to `/dashboard`** as the showcase (dark promo + card grid + "My next lessons" panel). Old palette tokens kept in `tailwind.config.ts` temporarily so un-restyled pages still compile — to be removed once every screen is migrated (then §5c palette docs get replaced). | User asked for a full visual overhaul, inspired by a concept (Cohort Portal brand/copy kept). Verified the dashboard in-browser (desktop + mobile, no overflow). **Open decisions flagged to user:** (1) course-card bottom-left uses real course meta, not a fabricated enrolled-peer avatar stack (no such data + privacy); (2) card bookmark is decorative — our `Bookmark` model is per-lesson, not per-course; (3) top-bar search is visual only (no global search backend). Not yet rolled out to catalog / lesson player / auth / admin. |
| 2026-07-12 | **Removed the manual admin-approval step — a confirmed email now activates every account.** `consumeVerificationToken` sets state straight to `ACTIVE` for both in-person (code) and self-serve accounts (no more `PENDING_ADMIN_APPROVAL` on new registrations). Onboarding tracker cut to **2 steps** (Create account → Verify email); `register/success` + `verify-email` copy now say "you're in, no waiting" (verify shows one "You're in! 🎉" state for all); removed the login `AWAITING_APPROVAL` block. Landing: How-it-works is now **two steps** ("Two steps. One of them is an email click."), path-picker in-person steps drop "Megz approves you", and the now-untrue "instructor-approved / no anonymous sign-ups" trust claims were softened to truthful ones (email-verified, private cohort, single-device, watermarked). Admin: `/admin` (the old pending-approval queue) **redirects to `/admin/students`** and the "Pending" nav link is removed; `approveStudentAction`/`rejectStudentAction`/reject-dialog kept in-repo but unused (suspend/reactivate still live on `/admin/students`). One-time data migration flipped any existing `PENDING_ADMIN_APPROVAL` students → `ACTIVE` (0 found). | User: with two vetted client types (in-person code holders + self-serve buyers who pay), manual approval is redundant friction. **Verified:** a non-code student who hits the verify link lands `ACTIVE` (DB-confirmed) and sees "You're in!" with no approval mention; landing shows two steps + updated in-person path. Payment approval (Phase 3) is untouched — that's a separate gate about confirming money. `AWAITING_APPROVAL` gate left in `account-state.ts` for exhaustiveness but is now unreachable. `typecheck` + `build` (30 routes) clean. |
| 2026-07-12 | **Exact sale price (fix: typed price drifted, e.g. 2000→2010).** Root cause: the discount was stored only as an **integer percent**, so a target sale price that isn't a whole-percent of the list (2000 off 3000 = 33.33% → rounds to 33% → 33% of 3000 = 2010) couldn't be represented. Added `Course.salePriceCents` (exact, source of truth) alongside `discountPercent` (now a rounded value kept in sync, for the "% OFF" badges + sale banner). New `effectivePriceCents` / `isOnSale` in `lib/money.ts`; `priceBreakdown`, `PriceTag`, catalog card, preview rail, and the purchase page/API all resolve the effective price via `salePriceCents` first (falling back to the percent for legacy courses). The admin `PricingFields` now submits the **sale price** as the canonical value (typed directly, or derived from a typed %); the action stores `salePriceCents` exactly + a synced rounded `discountPercent`. Migration `course_sale_price`. | User reported entering 2000 showed 2010. **Verified:** 7/7 math assertions (exact sale wins 2000 not 2010; in-person stacks on exact sale → 1200; legacy percent path still 900) + in-browser (a course saved with sale 2000 on a 3000 list shows exactly **EGP 2,000**, struck 3,000, 33% OFF). **Note:** courses that were saved under the old percent-only code still show the percent-rounded price until re-saved with an exact sale price (the original 2000 can't be recovered from a stored 33%). `typecheck` + `build` (30 routes) clean. |
| 2026-07-12 | **Paid "extra" content for in-person students (item-level) + coming-soon visibility + discount-or-price input.** (A) Catalog + preview now show a course if it's buyable **OR** `comingSoon` — a coming-soon teaser no longer needs "Sell this course" (query `OR: [{ isPurchasable, priceCents≠null }, { comingSoon }]`); the Coming-soon toggle moved to its own settings block. (B) New `LessonItem.isExtra` (per-lesson "Paid extra" toggle in the builder — `toggleItemExtra`, Coins icon + badge). **Two independent gates for an in-person DRIP student:** lecture items (isExtra=false) stay **free, attendance-gated** (drip); extra items (labs/LeetCode) are **paid, gated by `StudentCourseAccess.extrasUnlocked`** and NOT attendance-gated (paying unlocks ALL extras). `isExtra` is ignored for FULL/GATED (self-serve buyers get everything). New `getCourseItemLocks`/`getItemLock`/`canUnlockExtras` in `lib/content/access.ts`; outline + lesson-guard now compute **per-item** locks (open / "Not released yet" mist / "Unlock extra" amber → `/purchase`). Approving a purchase sets `extrasUnlocked=true` (keeps the in-person student's DRIP mode); the purchase page/API let an in-person DRIP student buy the extras (40% in-person price applies) instead of redirecting, with "Unlock the extras" copy. (C) Discount can be entered as a **% OR a target sale price** — new client `PricingFields` computes one from the other (`price` + `discountPercent` are what post). | User: in-person students get lecture VODs free (by attendance) but pay 40%-off to unlock labs/LeetCode/extras; and wanted coming-soon courses visible even when not for sale, plus a price-based discount entry. **Granularity = per-lesson** (user-chosen — labs/LeetCode live inside a week beside the free lecture). **Verified:** 11/11 logic assertions (item-extra gating with the two axes independent; coming-soon-not-for-sale shows; `canUnlockExtras`) + in-browser (outline free-lecture vs "Unlock extra" in an attended week + mist-locked unattended week; extras checkout "Unlock the extras" EGP 1200→720; catalog shows coming-soon "Preview" cards; builder "Paid extra" badges/Coins toggle; discount↔sale-price sync 720↔40%, 25%↔900). Migrations `course_coming_soon` + `lesson_extra_paid` applied. `typecheck` + `build` (30 routes) clean. |
| 2026-07-10 | **Removed the "Taking this course with Megz in person? Log in…" note** from the course-preview buy rail (`/catalog/[id]`). It was the only occurrence in the app. | User asked to remove it everywhere. |
| 2026-07-10 | **"Coming soon" course flag.** Added `Course.comingSoon` (migration `course_coming_soon`, applied to Supabase) + a checkbox in the course-settings "Sell this course" block. A purchasable course marked coming-soon is **teased, not sold**: it appears on `/catalog` (query widened to `isPurchasable AND (priceCents != null OR comingSoon)`, sorted live-first) with a mist "Coming soon" badge, no price, and a "Preview" CTA instead of "View"; the preview page (`/catalog/[id]`) shows a "Coming soon / Not yet available" rail (no buy button); free-preview lessons still work as a taster. **Buying is blocked**: `/purchase/[id]` redirects back to the teaser and `POST /api/purchase` returns 409. Excluded from the landing sale banner (don't advertise a sale on something unbuyable). Manual/in-person grants are unaffected — comingSoon only gates public self-serve purchase. | User wanted to publish a course as coming soon. Kept it a pure marketing/purchase gate (orthogonal to module publish/scheduling, which controls content readiness). Verified in-browser: catalog badge + Preview CTA, preview "Not yet available" rail, no buy path; `typecheck` clean. |
| 2026-07-10 | **Phase 4 — In-person students: registration codes, granular (drip) access, weekly attendance, private 40% pricing.** Migration `inperson_roster_drip_attendance` applied to Supabase. New models `RosterEntry` / `StudentModuleRelease` / `AttendanceRecord`; `StudentCourseAccess.accessMode` (FULL/DRIP/GATED, default GATED = behaviour-preserving); `Student.isInPerson`; `Purchase` price-breakdown fields; `Instructor.attendanceAutoRelease`. Registration gains an "I'm in person" branch (code → links roster + instructor, flags in-person, consumed atomically); a valid code **auto-approves** on email verification. `getEffectiveModuleLockStates` unifies the three modes behind the existing lock shape (outline + lesson-guard swapped, drip reuses mist/info locked styling). In-person **40% is private** (never on catalog/preview) and **stacks on the current effective price** via `priceBreakdown()`, applied on the checkout page + purchase API only. Admin: `/admin/roster`, `/admin/roster/student/[id]`, `/admin/attendance` (roster grid) + Roster/Attendance nav; attendance rate surfaced in the at-risk view. Emails: `registrationCodeEmail`, `lectureReleasedEmail`. See §5e. | User wanted a real-life-student path with instructor-controlled weekly release + attendance, at a quiet discount. **Chose module-level drip** (the product already calls modules "lectures" in its lock copy; same granularity as gating keeps precedence clean) and **week N ↔ Nth module** (makes attendance→release coherent). **Verified:** 14/14 logic assertions (code lifecycle incl. revoked/expired/case-insensitive; pricing stack public-630-vs-in-person-378 + "always < public"; DRIP/FULL/GATED lock states) + in-browser (roster list, student detail w/ 67% attendance, attendance grid, drip outline "not released yet", in-person checkout 900→630→378, catalog stays public-priced, register in-person branch). `typecheck` + `build` (30 routes) clean. **Two items flagged for user confirmation** (built default): code auto-approval (on), attendance→release automation (toggle, off by default). CSV import out of scope but model is import-ready. |
| 2026-07-09 | **Conversion overhaul — landing page + onboarding (user-approved plan; hero: "Walk into the exam already knowing it.").** Landing rebuilt around outcome → proof → self-route → act: **Hero** (outcome headline, proof chips, dual CTA "Create account" + "Watch a free lesson", success-moment visual cluster w/ ghost "calm." type); **Before→After** (`before-after.tsx`, dark "night before" panel vs. fern "with the portal"); **Free-lesson strip** (`free-lessons.tsx`, server component listing real live free-preview lessons, "no account needed"; also linked from navbar "Free Lesson"); **feature showcase re-headlined features→outcomes** (e.g. "Miss a lecture without losing marks", "Exam week arrives — the work's already done"); **Proof section** (`proof.tsx`, replaces About, id="about" kept for anchors: track-record chips + **5 testimonials — real names (Lina Amr, Marwan Khaled, Abdullah Ehab, Abderahman Yassin, Abderahman Hawary) with PLACEHOLDER quote text the user asked to fake for now**; arch-shaped initials avatars, `photo` prop swaps in a real image from `public/testimonials/`); **Two-path picker** (`path-picker.tsx`, in-person vs. self-serve routing); **How-it-works** rebuilt as 3 ghost-numeral steps framing approval as the quality gate; CTA banner gains "under a minute / free lesson" microcopy. **Onboarding fixes** (all surface-only): shared `OnboardingSteps` tracker + `WhileYouWait` free-lesson block (`components/onboarding-steps.tsx`) across register → register/success → verify-email; **fixed the verify-email CTA trap** (was "Continue to sign in", which errors for pending accounts → now sets expectations + free lessons, sign-in demoted to a link); login's AWAITING_APPROVAL state now shows a "review queue + watch a free lesson" box instead of a dead end; **StudentNav gained "Browse courses"** (self-serve buyers previously had NO in-app path to the catalog); dashboard gained a **"Start here / Pick up where you left off" momentum banner** (first untouched course with content, else first unfinished) and a **two-path-aware empty state** (shows pending-purchase status; catalog CTA); `approvedEmail` rewritten action-first ("You're in — sign in and start"). | Features tell, outcomes sell: every hesitation point (is it good? → free lesson; is it legit? → proof/testimonials; which path am I? → picker; what's the wait? → tracker + reassurance) now has an answer on the page, and every wait state converts dead time into engagement. Old `about.tsx` deleted (folded into proof). **Placeholder testimonial quotes must be replaced with real ones** — marked in `proof.tsx`. Verified in-browser (desktop + mobile, no overflow; animations freeze only under the preview's hidden-tab rAF pause — real tabs resume on visibility); `typecheck` + `build` (28 pages) clean. |
| 2026-07-09 | **Per-course discounts + landing sale badge.** Added `Course.discountPercent` (1–99; migration `course_discount` applied to Supabase). Admin course settings gained a "Discount (% off)" field. `lib/money.ts` gained `discountedCents` / `hasDiscount` / `parseDiscountPercent`; new shared `components/price-tag.tsx` renders the discounted price with the original struck through + a "% OFF" chip (chip suppressible where a separate badge exists). Wired discounted pricing through the catalog (rust corner "% OFF" pill + struck price), preview buy rail, and purchase page ("Amount to send"). **`POST /api/purchase` now snapshots the *discounted* price** the student actually pays. Landing: new `components/landing/sale-badge.tsx` (a circulating **SVG `<textPath>` ring that spins** via new `animate-spin-slow`, freezing under `prefers-reduced-motion`) + `sale-banner.tsx` (bold dark-bark panel, "Up to N% off", "Shop the sale" → `/catalog`) that renders **only when ≥1 purchasable course is discounted`; landing set to `force-dynamic` so it reflects live discounts. | User wanted course discounts strongly visible on the landing with a "text circulating effect". Chose **percent** discounts (cleanest for a "% OFF" badge and the rotating text) over fixed sale prices; coupon codes + expiry windows deferred (flagged). Verified in-browser: landing banner shows the spinning "40% OFF" sticker + "Up to 40% off · 2 courses on sale"; catalog shows EGP 900←1,500 (40%) and EGP 630←900 (30%) with corner pills; preview rail + purchase amount discounted; mobile stacks with no overflow; `typecheck` + `build` clean. Test discounts (40% Databases, 30% Intro) left live so the effect is visible — editable/clearable in each course's admin settings. |
| 2026-07-09 | **Catalog + dashboard card cleanup (user feedback: "not organized, gradient cut half the screen, courses not centred, View outside the orange shape").** Catalog: moved the fern/amber glow + dot-grid to a full-page atmosphere layer (masked fade) so it no longer stops with a hard line; switched the grid to `flex-wrap justify-center` (fixed-width cards) so any count centres; **fixed the misused arch** — it was a decorative blob behind the "View" text (collision) and is now a proper arch **icon well** holding a `BookOpen` icon, with "View" as a clear moss pill. Applied the same icon-well treatment to the student dashboard course cards (removed the identical floating-arch blob + hover-only "Open"). | The arch (`rounded-arch` = `999px 999px 0 0`) is a top-rounded *gate* meant to hold an icon; using it as a bottom-corner blob under text read as "text overflowing the shape". Same pattern existed on `/dashboard` → fixed both for consistency. Verified in-browser (catalog + dashboard); `typecheck` clean. |
| 2026-07-09 | **Phase 3 — Self-serve InstaPay course purchases.** Added a public catalog + preview + free-preview lessons, a pay-via-InstaPay + screenshot-upload flow, an admin Pending-Payments review queue (Approve auto-grants access via `StudentCourseAccess`, Reject carries a reason), submitted/approved/rejected emails, and a student `/purchases` history. Coexists additively with the manual in-person grant path — **both gates (account approval + payment approval) apply**. Data: `Purchase` model + `PurchaseStatus` enum; `Course.isPurchasable/priceCents/currency`; `LessonItem.isFreePreview`; `Instructor.instapay*` (configurable, not hardcoded). Migration `purchases` applied to Supabase. | User asked for a self-serve purchase path beside the existing manual one. **Verified end-to-end in-browser:** catalog (2 courses, EGP) → preview (locked outline + free-preview highlight + EGP buy rail) → free-preview reading + upsell → student buy (EGP 900, InstaPay handle) → `POST /api/purchase` 200 → duplicate guard 409 → `/purchases` "Under review" → admin queue shows the screenshot → **Approve → `StudentCourseAccess` created + `Purchase` APPROVED + student `/purchases` shows "Approved / Open"** (DB-confirmed). Price stored as a snapshot on `Purchase` so later price edits don't rewrite history. Screenshot uploads use the existing `StorageProvider` (local now — inherits the Supabase-adapter prod TODO). **Friction flag (per user request):** the two-step approval (account approval *then* payment approval) is intentional but may feel heavy — surfaced to the user to decide whether to auto-approve accounts that arrive via the purchase path, or merge the gates. Coupons/refunds/real gateway deliberately deferred. |
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
| 2026-07-08 | **Landing features section rebuilt into an interactive showcase** (`components/landing/feature-showcase.tsx` + `feature-mocks.tsx`; old `features.tsx` removed). Replaced the flat 6-card grid with **sticky-rail scrollytelling**: a pinned category rail (desktop) that highlights the centred panel via IntersectionObserver, five accent-differentiated categories (moss/mist/clay/amber/fern), each with staggered feature reveals + a stylized brand-palette **mock UI** (watermarked player, locked-lecture, code editor + feedback, announcement + at-risk, trust card). Count-up stats ("5 feature areas · 18+ tools"), parallax blobs, click-to-scroll rail. | User asked for a comprehensive "wow" showcase of everything built. **Honesty call (user-approved): omitted un-built edge features** (streaks/badges/certificates/notes/bookmarks/search) — only the 5 genuinely-shipped areas are shown; stat counts are real. Sticky broke under the section's `overflow-hidden` (parallax clip) → switched to `overflow-x-clip` (clips blobs without creating a scroll container that kills `position:sticky`). Degrades to a clean stacked list below `lg`; `prefers-reduced-motion` gates parallax/count-up/reveals. Scoped to the features section only — hero/about/how-it-works/CTA/footer untouched. |
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
