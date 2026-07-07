import { env } from "../env";
import type { EmailMessage } from "./index";

/**
 * Email content builders. Plain, provider-agnostic HTML + text. Keep these
 * simple and inline-styled so they render everywhere.
 */

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F3EEDB;margin:0;padding:24px;color:#34402A">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FBFAF3;border-radius:12px;padding:32px;border:1px solid #E0DBC5">
      <tr><td style="font-size:18px;font-weight:700;letter-spacing:0.5px;padding-bottom:8px;color:#34402A">the <span style="color:#6F7E5B">cohort</span> portal</td></tr>
      <tr><td style="font-size:16px;font-weight:600;padding-bottom:12px;color:#34402A">${title}</td></tr>
      <tr><td style="font-size:14px;line-height:1.6;color:#4A4C3E">${bodyHtml}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:16px 0;background:#6F7E5B;color:#F3EEDB;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${label}</a>`;
}

export function verificationEmail(to: string, token: string): EmailMessage {
  const link = `${env.APP_URL}/verify-email?token=${token}`;
  return {
    to,
    subject: "Confirm your Cohort Portal email address",
    html: layout(
      "Confirm your email",
      `<p>Welcome! Please confirm your email address to continue.</p>${button(link, "Confirm email")}
       <p style="color:#777;font-size:12px">Or paste this link into your browser:<br>${link}</p>
       <p style="color:#777;font-size:12px">This link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.</p>`,
    ),
    text: `Confirm your Cohort Portal email address by visiting:\n${link}\n\nThis link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.`,
  };
}

export function passwordResetEmail(to: string, token: string): EmailMessage {
  const link = `${env.APP_URL}/reset-password?token=${token}`;
  return {
    to,
    subject: "Reset your Cohort Portal password",
    html: layout(
      "Reset your password",
      `<p>We received a request to reset your password. If this was you, click below.</p>${button(link, "Reset password")}
       <p style="color:#777;font-size:12px">Or paste this link into your browser:<br>${link}</p>
       <p style="color:#777;font-size:12px">This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes and can be used once. If you didn't request this, ignore this email.</p>`,
    ),
    text: `Reset your Cohort Portal password by visiting:\n${link}\n\nThis link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you didn't request this, ignore this email.`,
  };
}

export function approvedEmail(to: string): EmailMessage {
  const link = `${env.APP_URL}/login`;
  return {
    to,
    subject: "Your Cohort Portal account has been approved",
    html: layout(
      "Account approved 🎉",
      `<p>Good news — an instructor has approved your account. You can now sign in.</p>${button(link, "Sign in")}`,
    ),
    text: `Your Cohort Portal account has been approved. Sign in at:\n${link}`,
  };
}

export function rejectedEmail(to: string, reason?: string): EmailMessage {
  return {
    to,
    subject: "Update on your Cohort Portal registration",
    html: layout(
      "Registration not approved",
      `<p>Unfortunately your registration was not approved.</p>${
        reason ? `<p style="background:#EFEAD6;padding:12px;border-radius:8px"><strong>Reason:</strong> ${reason}</p>` : ""
      }<p>If you believe this is a mistake, please contact your instructor.</p>`,
    ),
    text: `Your Cohort Portal registration was not approved.${reason ? `\n\nReason: ${reason}` : ""}`,
  };
}

export function announcementEmail(
  to: string,
  title: string,
  preview: string,
  scopeLabel: string,
): EmailMessage {
  const link = `${env.APP_URL}/announcements`;
  return {
    to,
    subject: `${title}`,
    html: layout(
      title,
      `<p style="color:#6F7E5B;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">${scopeLabel}</p>
       <p>${preview}</p>${button(link, "Read in Cohort Portal")}`,
    ),
    text: `${scopeLabel}\n\n${title}\n\n${preview}\n\nRead it: ${link}`,
  };
}

export function assignmentReminderEmail(to: string, title: string, dueAt: Date): EmailMessage {
  const link = `${env.APP_URL}/dashboard`;
  return {
    to,
    subject: `Reminder: "${title}" is due soon`,
    html: layout(
      "Assignment due soon",
      `<p><strong>${title}</strong> is due ${dueAt.toLocaleString()}.</p>
       <p>If you haven't submitted yet, now's the time.</p>${button(link, "Go to your courses")}`,
    ),
    text: `Reminder: "${title}" is due ${dueAt.toLocaleString()}.\nSubmit at: ${link}`,
  };
}

export function courseAccessEmail(to: string, courseTitles: string[]): EmailMessage {
  const link = `${env.APP_URL}/dashboard`;
  const list = courseTitles.map((t) => `<li>${t}</li>`).join("");
  return {
    to,
    subject: "You've been granted access to new course(s)",
    html: layout(
      "New course access",
      `<p>You now have access to:</p><ul>${list}</ul>${button(link, "Go to dashboard")}`,
    ),
    text: `You've been granted access to: ${courseTitles.join(", ")}.\nView them at:\n${link}`,
  };
}
