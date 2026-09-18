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
    subject: "You're in — your Cohort Portal account is approved",
    html: layout(
      "You're in 🎉",
      `<p>Megz approved your account — you're officially in the cohort.</p><p>Sign in, open your course, and start with the first lesson. If you're buying a course yourself, the catalog is waiting.</p>${button(link, "Sign in and start")}`,
    ),
    text: `Megz approved your Cohort Portal account — you're in. Sign in and start your first lesson:\n${link}`,
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

export function registrationCodeEmail(to: string, name: string, code: string): EmailMessage {
  const link = `${env.APP_URL}/register`;
  return {
    to,
    subject: "Your Cohort Portal registration code",
    html: layout(
      `Welcome, ${name} 👋`,
      `<p>Megz set up your spot on Cohort Portal. Use this code when you register — it approves your account automatically:</p>
       <p style="font-family:ui-monospace,monospace;font-size:22px;font-weight:700;letter-spacing:2px;background:#EFEAD6;border-radius:8px;padding:14px 18px;text-align:center;color:#34402A">${code}</p>
       <p>On the sign-up page, tick <em>“I'm taking classes with Megz in person”</em> and enter the code above.</p>${button(link, "Register now")}`,
    ),
    text: `Welcome to Cohort Portal, ${name}. Your registration code is: ${code}\nRegister at ${link} — tick "I'm taking classes with Megz in person" and enter the code.`,
  };
}

export function lectureReleasedEmail(
  to: string,
  courseTitle: string,
  moduleTitle: string,
): EmailMessage {
  const link = `${env.APP_URL}/dashboard`;
  return {
    to,
    subject: `New lecture unlocked in ${courseTitle}`,
    html: layout(
      "New material is ready",
      `<p>Megz just released a new lecture to you:</p>
       <p style="font-weight:600;color:#34402A">${courseTitle} — ${moduleTitle}</p>
       <p>It's unlocked on your dashboard now.</p>${button(link, "Open it")}`,
    ),
    text: `Megz released a new lecture to you: ${courseTitle} — ${moduleTitle}.\nOpen it at ${link}`,
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

export function purchaseSubmittedEmail(to: string, courseTitle: string): EmailMessage {
  const link = `${env.APP_URL}/purchases`;
  return {
    to,
    subject: `We've received your payment for ${courseTitle}`,
    html: layout(
      "Payment received — under review",
      `<p>Thanks! We got your payment proof for <strong>${courseTitle}</strong>.</p>
       <p>Megz will review it shortly and your access will be granted as soon as it's confirmed —
       usually within a day. You'll get an email the moment it's approved.</p>${button(link, "View your purchases")}`,
    ),
    text: `We received your payment proof for ${courseTitle}. Megz will review it shortly.\nTrack it: ${link}`,
  };
}

export function purchaseApprovedEmail(to: string, courseTitle: string): EmailMessage {
  const link = `${env.APP_URL}/dashboard`;
  return {
    to,
    subject: `You're in — ${courseTitle} is unlocked`,
    html: layout(
      "Payment approved 🎉",
      `<p>Your payment for <strong>${courseTitle}</strong> is confirmed and the course is now in your
       dashboard. Dive in whenever you're ready.</p>${button(link, "Start the course")}`,
    ),
    text: `Your payment for ${courseTitle} is approved — it's now in your dashboard.\n${link}`,
  };
}

export function purchaseRejectedEmail(to: string, courseTitle: string, reason?: string): EmailMessage {
  const link = `${env.APP_URL}/purchases`;
  return {
    to,
    subject: `Action needed on your payment for ${courseTitle}`,
    html: layout(
      "We couldn't confirm your payment",
      `<p>We weren't able to confirm your payment for <strong>${courseTitle}</strong>.</p>${
        reason
          ? `<p style="background:#EFEAD6;padding:12px;border-radius:8px"><strong>Reason:</strong> ${reason}</p>`
          : ""
      }<p>No need to start over — just re-upload a clearer screenshot of the transfer and we'll take
       another look.</p>${button(link, "Re-upload proof")}`,
    ),
    text: `We couldn't confirm your payment for ${courseTitle}.${reason ? `\nReason: ${reason}` : ""}\nRe-upload proof: ${link}`,
  };
}
