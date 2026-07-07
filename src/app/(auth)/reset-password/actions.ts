"use server";

import { redirect } from "next/navigation";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumePasswordReset } from "@/lib/auth/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getClientInfo } from "@/lib/http";
import { zodFieldErrors, type FormState } from "@/lib/form";

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { ip } = getClientInfo();
  const rl = rateLimit("resetPassword", ip);
  if (!rl.ok) {
    return { ok: false, message: `Please wait ${rl.retryAfterSeconds}s before trying again.` };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const result = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "expired"
          ? "This reset link has expired. Request a new one."
          : "This reset link is invalid or has already been used. Request a new one.",
      code: "TOKEN_INVALID",
    };
  }

  // Success — all sessions were revoked; send them to log in fresh.
  redirect("/login?reason=password-changed");
}
