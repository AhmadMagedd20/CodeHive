"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/password";
import { getDefaultInstructorId } from "@/lib/instructor";
import { issueVerificationToken } from "@/lib/auth/verification";
import { verifyCaptcha } from "@/lib/captcha";
import { rateLimit } from "@/lib/rate-limit";
import { getClientInfo } from "@/lib/http";
import { zodFieldErrors, type FormState } from "@/lib/form";

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { ip } = getClientInfo();

  const rl = rateLimit("register", ip);
  if (!rl.ok) {
    return {
      ok: false,
      message: `Too many registration attempts. Please try again in ${rl.retryAfterSeconds}s.`,
    };
  }

  const honeypot = String(formData.get("website") ?? "");
  // Bot protection: if the hidden honeypot is filled, pretend success without
  // creating anything, so bots don't learn they were caught.
  if (honeypot.trim() !== "") {
    redirect(`/register/success?email=${encodeURIComponent(String(formData.get("email") ?? ""))}`);
  }

  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    university: formData.get("university"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
    website: honeypot,
    captchaToken: formData.get("captchaToken") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  if (!(await verifyCaptcha(data.captchaToken))) {
    return { ok: false, message: "CAPTCHA verification failed. Please try again." };
  }

  // Duplicate check (clear inline errors). Enumeration is acceptable here per
  // spec — the anti-enumeration rule applies to login, not registration.
  const existing = await prisma.student.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const fieldErrors: Record<string, string> = {};
    if (existing.email === data.email) fieldErrors.email = "An account with this email already exists.";
    if (existing.username === data.username) fieldErrors.username = "This username is already taken.";
    return { ok: false, fieldErrors, message: "Please fix the highlighted fields." };
  }

  const passwordHash = await hashPassword(data.password);
  const instructorId = await getDefaultInstructorId();

  let student;
  try {
    student = await prisma.student.create({
      data: {
        username: data.username,
        email: data.email,
        university: data.university,
        passwordHash,
        instructorId,
        state: "PENDING_EMAIL_VERIFICATION",
      },
    });
  } catch (err) {
    // Unique-constraint race between the check above and insert.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        message: "That email or username was just taken. Please try different details.",
      };
    }
    throw err;
  }

  await issueVerificationToken(student);

  redirect(`/register/success?email=${encodeURIComponent(data.email)}`);
}
