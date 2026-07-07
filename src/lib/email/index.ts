import { env } from "../env";

/**
 * Single pluggable email seam. Everything in the app calls `sendEmail()`.
 * Swap providers via EMAIL_PROVIDER without touching call sites.
 *
 * - console (default / dev): logs the message + any link to the server console
 *   so the whole flow works with no provider key.
 * - smtp: nodemailer.
 * - resend: Resend HTTP API (no SDK dependency).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaConsole(msg: EmailMessage): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "📧 ─── EMAIL (console provider) ─────────────────────────────",
      `  To:      ${msg.to}`,
      `  Subject: ${msg.subject}`,
      "  ---",
      msg.text
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n"),
      "────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

async function sendViaSmtp(msg: EmailMessage): Promise<void> {
  const nodemailer = await import("nodemailer");
  if (!env.SMTP_HOST) throw new Error("EMAIL_PROVIDER=smtp but SMTP_HOST is not set");
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: env.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  if (!env.RESEND_API_KEY) throw new Error("EMAIL_PROVIDER=resend but RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
  }
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  try {
    switch (env.EMAIL_PROVIDER) {
      case "smtp":
        return await sendViaSmtp(msg);
      case "resend":
        return await sendViaResend(msg);
      case "console":
      default:
        return await sendViaConsole(msg);
    }
  } catch (err) {
    // Never let email failure crash a request flow; log and continue. In dev
    // we still surface the link via the console fallback.
    // eslint-disable-next-line no-console
    console.error("[email] send failed:", err);
    if (env.EMAIL_PROVIDER !== "console") await sendViaConsole(msg);
  }
}
