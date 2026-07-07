"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validation/auth";
import { authenticate } from "@/lib/auth/login";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { getClientInfo } from "@/lib/http";
import { type FormState } from "@/lib/form";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { ip, userAgent } = getClientInfo();

  const rl = rateLimit("login", ip);
  if (!rl.ok) {
    return { ok: false, message: `Too many attempts. Please try again in ${rl.retryAfterSeconds}s.` };
  }

  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Enter your email/username and password." };
  }

  const result = await authenticate(parsed.data.identifier, parsed.data.password, { ip, userAgent });

  switch (result.status) {
    case "ok":
      await createSession(result.principal, { ip, userAgent });
      redirect(result.principal.kind === "instructor" ? "/admin" : "/dashboard");

    case "invalid":
      // Generic — never reveal whether the account exists.
      return { ok: false, message: "Invalid email/username or password." };

    case "locked":
      return {
        ok: false,
        message: `Too many failed attempts. This account is temporarily locked. Try again in ${result.retryAfterMinutes} minute(s).`,
      };

    case "state_blocked":
      return { ok: false, message: result.gate.message, code: result.gate.code };

    case "two_factor_required":
      // Seam only — no 2FA UI yet. Should be unreachable with the flag off.
      return {
        ok: false,
        message: "Two-factor authentication is required but not yet available. Contact your instructor.",
      };
  }
}
