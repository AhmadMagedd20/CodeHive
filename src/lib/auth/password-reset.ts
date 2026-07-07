import { prisma } from "../prisma";
import { env } from "../env";
import { generateToken, hashToken } from "../tokens";
import { hashPassword } from "../password";
import { sendEmail } from "../email";
import { passwordResetEmail } from "../email/templates";
import { revokeAllStudentSessions } from "./session";
import { audit } from "../audit";

/**
 * Password reset tokens: single-use, short-lived (PASSWORD_RESET_TTL_MINUTES),
 * hash-only storage. Requesting one always yields a generic response to avoid
 * account enumeration.
 */
export async function issuePasswordReset(email: string): Promise<void> {
  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) return; // silent — no enumeration

  const raw = generateToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { studentId: student.id, consumedAt: null } }),
    prisma.passwordResetToken.create({
      data: { tokenHash: hashToken(raw), studentId: student.id, expiresAt },
    }),
  ]);

  await sendEmail(passwordResetEmail(student.email, raw));
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

/**
 * Consume a reset token and set the new password. Invalidates ALL sessions for
 * the account so every device is forced to re-authenticate.
 */
export async function consumePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<ResetResult> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.consumedAt) return { ok: false, reason: "invalid" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.student.update({
      where: { id: record.studentId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
  ]);

  await revokeAllStudentSessions(record.studentId);
  await audit({
    event: "PASSWORD_RESET",
    success: true,
    studentId: record.studentId,
    message: "reset via email link",
  });

  return { ok: true };
}
