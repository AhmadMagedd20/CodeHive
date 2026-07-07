"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile widget. Rendered only when CAPTCHA is enabled and a site
 * key is configured. Turnstile injects a hidden input named `captchaToken`
 * (via data-response-field-name) that the server action reads. When disabled,
 * renders nothing and the flow relies on honeypot + rate limiting.
 */
export function Turnstile({ siteKey }: { siteKey?: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-response-field-name="captchaToken"
      />
    </>
  );
}
