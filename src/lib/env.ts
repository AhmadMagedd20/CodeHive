import { z } from "zod";

/**
 * Centralised, validated environment config. Import `env` anywhere on the
 * server instead of touching `process.env` directly. All secrets/tunables
 * live here (PROJECT.md §5). Fails fast at boot if something required is
 * missing.
 */

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : v === "true" || v === "1"));

const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? def : Number(v)))
    .pipe(z.number().int().positive());

/**
 * Best-guess public URL of this deployment, used only as the APP_URL default.
 * Checked in order of specificity; an explicit APP_URL overrides all of it.
 */
function detectAppUrl(): string {
  // Render: full URL including the scheme.
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  // Render fallback: hostname only.
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
  }
  // Vercel: stable production domain, hostname only.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),
  /**
   * Public base URL, used to build every link in every email.
   *
   * Auto-detected from the host when deployed, so a fresh deploy sends working
   * verification links with nothing set by hand — you can't know the URL until
   * after the first deploy, and a wrong value silently breaks the one link
   * every signup depends on.
   *
   *  - Render supplies RENDER_EXTERNAL_URL, already including the scheme.
   *  - Vercel supplies VERCEL_PROJECT_PRODUCTION_URL, the STABLE production
   *    domain, hostname only. Do not substitute VERCEL_URL: that is unique per
   *    deployment, so emailed links would rot on the next build.
   *
   * An explicit APP_URL always wins, e.g. once a custom domain is added.
   */
  APP_URL: z.string().url().default(detectAppUrl()),

  // Defaults to `resend` in production and `console` in development, so a
  // deploy can't silently console-log its verification emails and leave
  // nobody able to register. An explicit value always wins — `console` stays
  // available under NODE_ENV=production for local `next start` smoke tests.
  EMAIL_PROVIDER: z
    .enum(["console", "smtp", "resend"])
    .default(process.env.NODE_ENV === "production" ? "resend" : "console"),
  EMAIL_FROM: z.string().default("The Cohort Portal <no-reply@example.com>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: int(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  EMAIL_VERIFICATION_TTL_HOURS: int(48),
  PASSWORD_RESET_TTL_MINUTES: int(60),
  SESSION_INACTIVITY_MINUTES: int(30),

  MAX_LOGIN_ATTEMPTS: int(5),
  LOGIN_LOCK_MINUTES: int(15),

  CAPTCHA_ENABLED: bool(false),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  TWO_FACTOR_ENABLED: bool(false),

  // --- Phase 2: content, media, scheduling ---------------------------------
  // `local` = dev only (disk + <video>). `bunny` = production (browser-direct
  // TUS upload, iframe playback). See lib/video/bunny.ts.
  VIDEO_PROVIDER: z.enum(["local", "bunny"]).default("local"),
  BUNNY_STREAM_LIBRARY_ID: z.string().optional(),
  BUNNY_STREAM_API_KEY: z.string().optional(),
  /** Enables expiring embed links. Optional: without it, embeds are unsigned. */
  BUNNY_STREAM_TOKEN_KEY: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
  STORAGE_DIR: z.string().default("./storage"), // local provider root (dev)
  // Supabase Storage adapter (only needed when STORAGE_PROVIDER=supabase)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("cohort-media"),
  // Secret that must be presented to /api/cron/tick (scheduled jobs). If unset,
  // the cron endpoint is disabled (returns 503).
  CRON_SECRET: z.string().optional(),
  AT_RISK_INACTIVE_DAYS: int(7),
  ASSIGNMENT_REMINDER_HOURS: int(24),

  // --- Admin Telegram alerts (optional) ------------------------------------
  // A second notification channel for the INSTRUCTOR only (student emails are
  // unchanged). Both must be set for alerts to send; if either is missing the
  // app runs normally and just skips them. See lib/telegram.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
})
  // Fail at boot rather than at the first student registration: an email
  // provider without its credential drops mail silently from the caller's
  // point of view, and email verification is step one of every signup.
  .superRefine((v, ctx) => {
    if (v.EMAIL_PROVIDER === "resend" && !v.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "EMAIL_PROVIDER=resend requires RESEND_API_KEY",
      });
    }
    if (v.EMAIL_PROVIDER === "smtp" && !v.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "EMAIL_PROVIDER=smtp requires SMTP_HOST",
      });
    }
    if (v.VIDEO_PROVIDER === "bunny" && (!v.BUNNY_STREAM_LIBRARY_ID || !v.BUNNY_STREAM_API_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BUNNY_STREAM_API_KEY"],
        message: "VIDEO_PROVIDER=bunny requires BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY",
      });
    }
    if (
      v.STORAGE_PROVIDER === "supabase" &&
      (!v.SUPABASE_URL || !v.SUPABASE_SERVICE_ROLE_KEY)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
        message: "STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      });
    }
  });

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
