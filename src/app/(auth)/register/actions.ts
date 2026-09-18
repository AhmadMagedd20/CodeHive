"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/password";
import { getDefaultInstructorId } from "@/lib/instructor";
import { checkRegistrationCode } from "@/lib/roster";
import { issueVerificationToken } from "@/lib/auth/verification";
import { verifyCaptcha } from "@/lib/captcha";
import { rateLimit } from "@/lib/rate-limit";
import { getClientInfo } from "@/lib/http";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { sendTelegramMessage } from "@/lib/telegram";
import { newRegistrationMessage } from "@/lib/telegram/templates";

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
    isInPerson: formData.get("isInPerson") === "on",
    studentCode: formData.get("studentCode") ?? "",
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

  // In-person branch: a valid code links the account to THAT instructor's
  // roster and flags it in-person. An invalid code fails with a single opaque
  // message (no code-guessing). The code is consumed atomically at create time.
  let instructorId: string;
  let rosterEntryId: string | null = null;
  if (data.isInPerson) {
    const check = await checkRegistrationCode(data.studentCode);
    if (!check.ok) {
      return { ok: false, fieldErrors: { studentCode: "This code isn't valid." } };
    }
    instructorId = check.entry.instructorId;
    rosterEntryId = check.entry.id;
  } else {
    instructorId = await getDefaultInstructorId();
  }

  const passwordHash = await hashPassword(data.password);

  let student;
  try {
    student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          username: data.username,
          email: data.email,
          university: data.university,
          passwordHash,
          instructorId,
          isInPerson: rosterEntryId != null,
          state: "PENDING_EMAIL_VERIFICATION",
        },
      });
      if (rosterEntryId) {
        // Consume the code, but only if still unused — guards a double-use race.
        const consumed = await tx.rosterEntry.updateMany({
          where: { id: rosterEntryId, usedAt: null, studentId: null, revokedAt: null },
          data: { usedAt: new Date(), studentId: created.id },
        });
        if (consumed.count === 0) {
          throw new CodeRaceError();
        }
      }
      return created;
    });
  } catch (err) {
    if (err instanceof CodeRaceError) {
      return { ok: false, fieldErrors: { studentCode: "This code isn't valid." } };
    }
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

  // Instructor alert (best-effort, never blocks the signup). Fired at account
  // creation — i.e. before email verification — so Megz sees every attempt.
  // Must come BEFORE redirect(), which throws to unwind the request.
  await sendTelegramMessage(
    newRegistrationMessage({
      username: student.username,
      email: student.email,
      university: student.university,
      isInPerson: student.isInPerson,
    }),
  );

  redirect(`/register/success?email=${encodeURIComponent(data.email)}`);
}

/** Internal sentinel: the code was consumed by someone else mid-transaction. */
class CodeRaceError extends Error {}
