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

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
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
  VIDEO_PROVIDER: z.enum(["local"]).default("local"),
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
