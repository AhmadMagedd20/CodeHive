import { env } from "../env";

/**
 * Telegram alerts for the INSTRUCTOR — a second notification channel alongside
 * the student emails in `lib/email`, never a replacement for them.
 *
 * Mirrors the `sendEmail()` seam: every call site just calls
 * `sendTelegramMessage()` and never has to think about failure. Sending is
 * strictly best-effort — a bad token, a rate limit, or Telegram being down must
 * never surface to a student mid-registration or mid-checkout.
 */

const API_BASE = "https://api.telegram.org";

/** Both credentials are required; either missing = feature simply off. */
export function isTelegramConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

/**
 * Escape values interpolated into a message.
 *
 * We send with `parse_mode: HTML` rather than Markdown: Telegram's legacy
 * Markdown has unreliable escaping, and student data routinely contains its
 * special characters (an underscore in an email, a `-` in a course title) which
 * would make the API reject the whole message. HTML needs only these three
 * characters escaped and renders the same bold, so alerts can't silently fail
 * on a realistic name or course title.
 */
function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bold, with the content escaped. */
export function b(value: string): string {
  return `<b>${esc(value)}</b>`;
}

export { esc };

/**
 * Send a message to the configured chat. Resolves either way — callers should
 * NOT await-and-branch on this; treat it as fire-and-forget.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  if (!isTelegramConfigured()) {
    // eslint-disable-next-line no-console
    console.info("[telegram] not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — skipping");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      // Don't let a hanging Telegram request hold a student's request open.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`[telegram] send failed: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[telegram] send failed:", err);
  }
}
