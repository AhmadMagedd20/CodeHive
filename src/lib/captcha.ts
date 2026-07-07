import { env } from "./env";

/**
 * CAPTCHA verification, stubbed behind CAPTCHA_ENABLED. When disabled, always
 * passes (registration still has honeypot + rate limiting). When enabled,
 * verifies a Cloudflare Turnstile token. Swap the provider here without
 * touching call sites.
 */
export async function verifyCaptcha(token: string | undefined | null): Promise<boolean> {
  if (!env.CAPTCHA_ENABLED) return true;
  if (!env.TURNSTILE_SECRET_KEY) {
    // Misconfiguration: enabled but no key. Fail closed but log loudly.
    // eslint-disable-next-line no-console
    console.error("[captcha] CAPTCHA_ENABLED but TURNSTILE_SECRET_KEY is unset");
    return false;
  }
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const captchaEnabled = env.CAPTCHA_ENABLED;
