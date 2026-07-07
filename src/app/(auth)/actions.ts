"use server";

import { prisma } from "@/lib/prisma";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { issueVerificationToken } from "@/lib/auth/verification";
import { rateLimit } from "@/lib/rate-limit";
import { getClientInfo } from "@/lib/http";
import { type FormState } from "@/lib/form";

/**
 * Resend the email-verification link. Always returns the same generic success
 * message regardless of whether the account exists / needs verification, so it
 * can't be used to enumerate accounts.
 */
export async function resendVerificationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { ip } = getClientInfo();
  const rl = rateLimit("resendVerification", ip);
  if (!rl.ok) {
    return { ok: false, message: `Please wait ${rl.retryAfterSeconds}s before requesting again.` };
  }

  const parsed = resendVerificationSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const student = await prisma.student.findUnique({ where: { email: parsed.data.email } });
  if (student && student.state === "PENDING_EMAIL_VERIFICATION") {
    await issueVerificationToken(student);
  }

  return {
    ok: true,
    message:
      "If that email is registered and still needs confirmation, we've sent a new verification link.",
  };
}
