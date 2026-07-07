# LMS — Login & Registration Module

The foundational auth module for a Learning Management System: registration, email
confirmation, admin approval, course access control, login/logout with strict single-session,
and password management. Built with Next.js 14 (App Router), TypeScript, Prisma + PostgreSQL,
Tailwind + shadcn-style UI, and custom argon2-based auth.

> **`PROJECT.md` is the source of truth** for decisions, current state, and env vars. Read it
> alongside this README.

---

## Prerequisites

- Node.js 18+ (developed on Node 23)
- [pnpm](https://pnpm.io/) 10+
- A [Supabase](https://supabase.com) project (free tier) — this is the database. No Docker needed.

## Quick start (Supabase)

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file
cp .env.example .env
#   Generate a session secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Set the database URLs.** In your Supabase project → **Connect**, copy both connection
strings into `.env`:

```dotenv
# Session pooler (port 5432) — used for both app runtime and migrations
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

For a long-running server (Next.js dev/node), use the **Session pooler (5432)** for both — it's
the most reliable. The transaction pooler (6543 + `?pgbouncer=true`) is only preferable for
serverless/edge deploys. Encode any `@` in your password as `%40`.

```bash
# 4. Create the schema
pnpm db:migrate     # prisma migrate dev  (name the first migration e.g. "init")

# 5. Seed one instructor/admin + sample courses
pnpm db:seed

# 6. Run the dev server
pnpm dev            # http://localhost:3000
```

> **Local Docker alternative.** Prefer offline dev? Run `pnpm db:up` (docker-compose Postgres)
> and set both `DATABASE_URL` and `DIRECT_URL` in `.env` to
> `postgresql://postgres:postgres@localhost:5432/lms?schema=public`.

> **Note:** we use Supabase purely as managed Postgres. The app has its own custom auth — it does
> **not** use Supabase Auth.

### Default seeded admin

`pnpm db:seed` creates an instructor you can sign in with (override via env before seeding):

- **Email:** `admin@lms.local` (`SEED_INSTRUCTOR_EMAIL`)
- **Password:** `Admin!12345` (`SEED_INSTRUCTOR_PASSWORD`)

Sign in at `/login`; instructors are routed to `/admin`, students to `/dashboard`.

---

## Trying the full flow locally

1. **Register** a student at `/register` (username, email, university GUC/GIU, password).
2. **Confirm email** — with the default `EMAIL_PROVIDER=console`, the confirmation link is
   **printed to the dev-server console**. Open it to verify. (See "Email" below.)
3. **Admin approval** — sign in as the seeded instructor at `/login`, go to `/admin`, and
   **Approve** the pending registration. (Reject with an optional reason is also there.)
4. **Grant courses** — in `/admin/students`, grant one or more sample courses to the student.
5. **Student login** — sign in as the student at `/login`; the dashboard shows only the granted
   courses. Try logging in from a second browser to see the **single-session** takeover: the
   first browser is signed out with "You've been logged out because your account was signed in
   elsewhere."
6. **Audit log** — `/admin/audit` lists every login attempt (success/fail, IP) and account event.

---

## Email

All email goes through a single pluggable `sendEmail()` (`src/lib/email/index.ts`). Choose the
provider with `EMAIL_PROVIDER`:

| Value     | Behaviour                                                                        |
| --------- | -------------------------------------------------------------------------------- |
| `console` | **Default.** Logs the message + link to the server console. No key needed — ideal for dev. |
| `smtp`    | Sends via SMTP (nodemailer). Set `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`. |
| `resend`  | Sends via the Resend HTTP API. Set `RESEND_API_KEY`.                              |

**If no provider key is set**, keep `EMAIL_PROVIDER=console` and read links from the terminal —
nothing fails. Verification and reset links look like:

```
📧 ─── EMAIL (console provider) ───
  To:      student@example.com
  Subject: Confirm your LMS email address
  ---
  Confirm your LMS email address by visiting:
  http://localhost:3000/verify-email?token=...
```

---

## Scripts

| Command            | What it does                                          |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Start the dev server                                  |
| `pnpm build`       | `prisma generate` + production build                  |
| `pnpm start`       | Run the production build                              |
| `pnpm test`        | Run the Vitest suite                                  |
| `pnpm typecheck`   | `tsc --noEmit`                                         |
| `pnpm lint`        | ESLint (next lint)                                     |
| `pnpm format`      | Prettier write                                        |
| `pnpm db:up` / `db:down` | Start / stop the docker-compose Postgres        |
| `pnpm db:migrate`  | Create + apply a dev migration                        |
| `pnpm db:deploy`   | Apply migrations (CI/prod)                            |
| `pnpm db:seed`     | Seed instructor + sample courses                      |
| `pnpm db:reset`    | Drop, re-migrate, and re-seed                          |
| `pnpm db:studio`   | Open Prisma Studio                                    |

---

## Environment variables

Full list with descriptions is in [`.env.example`](.env.example) and `PROJECT.md §5`. Required:
`DATABASE_URL`, `SESSION_SECRET`, `APP_URL`. Everything else (email provider, token/session
lifetimes, `MAX_LOGIN_ATTEMPTS`, CAPTCHA, `TWO_FACTOR_ENABLED`) has sensible defaults.

---

## Tests

`pnpm test` runs the security-critical suite (no database required — Prisma is mocked where
needed):

- **`password.test.ts`** — argon2 hashing round-trips, wrong-password rejection, random salt,
  strength rules.
- **`account-state.test.ts`** — each account state maps to a distinct, correct login outcome.
- **`session.test.ts`** — strict single-session: a new session deletes the previous one first,
  and only the token hash is stored.
- **`login.test.ts`** — `authenticate()` blocks by state/lockout, rejects wrong passwords, and
  never enumerates unknown accounts.

---

## Security notes

- Passwords hashed with **argon2id**; only hashes are stored/logged.
- Session tokens are **opaque, server-side, single-per-account**, stored as SHA-256 hashes and
  HMAC-signed in an HTTP-only cookie (`Secure` in production).
- Login is **generic on failure** (no account enumeration); audit log records every attempt.
- **Rate limiting** on all auth endpoints (in-memory; swap for Redis in prod — see `PROJECT.md §7`).
- HTTPS enforced in production via middleware; baseline security headers set.
- Registration: honeypot + rate limiting, optional Cloudflare Turnstile behind `CAPTCHA_ENABLED`.
- **2FA seam** and **multi-tenant `instructorId`** are built in but not surfaced (see `PROJECT.md §3`).
