"use server";

import { forgotPasswordSchema } from "@/lib/validation/auth";
import { issuePasswordReset } from "@/lib/auth/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getClientInfo } from "@/lib/http";
import { type FormState } from "@/lib/form";

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { ip } = getClientInfo();
  const rl = rateLimit("forgotPassword", ip);
  if (!rl.ok) {
    return { ok: false, message: `Please wait ${rl.retryAfterSeconds}s before trying again.` };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  await issuePasswordReset(parsed.data.email);

  // Always generic — never reveal whether the email is registered.
  return {
    ok: true,
    message:
      "If an account exists for that email, we've sent a password reset link. Check your inbox.",
  };
}
