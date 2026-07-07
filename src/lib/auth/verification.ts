import { prisma } from "../prisma";
import { env } from "../env";
import { generateToken, hashToken } from "../tokens";
import { sendEmail } from "../email";
import { verificationEmail } from "../email/templates";

/**
 * Email verification tokens: single-use, expiring, only the hash is stored.
 * Issuing a new token invalidates any outstanding ones for the student.
 */
export async function issueVerificationToken(student: {
  id: string;
  email: string;
}): Promise<void> {
  const raw = generateToken();
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { studentId: student.id, consumedAt: null } }),
    prisma.verificationToken.create({
      data: { tokenHash: hashToken(raw), studentId: student.id, expiresAt },
    }),
  ]);

  await sendEmail(verificationEmail(student.email, raw));
}

export type VerifyResult =
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Consume a verification token. Advances the student from
 * PENDING_EMAIL_VERIFICATION to PENDING_ADMIN_APPROVAL. Idempotent-ish: a
 * second click on a consumed link for an already-verified account reports
 * alreadyVerified rather than an error.
 */
export async function consumeVerificationToken(rawToken: string): Promise<VerifyResult> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { student: true },
  });

  if (!record) return { ok: false, reason: "invalid" };

  if (record.consumedAt) {
    // Already used. If the student is verified, treat as success (friendly).
    if (record.student.state !== "PENDING_EMAIL_VERIFICATION") {
      return { ok: true, alreadyVerified: true };
    }
    return { ok: false, reason: "invalid" };
  }

  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.student.update({
      where: { id: record.studentId },
      data: {
        emailVerifiedAt: new Date(),
        // Only advance if still pending verification (don't downgrade others).
        ...(record.student.state === "PENDING_EMAIL_VERIFICATION"
          ? { state: "PENDING_ADMIN_APPROVAL" }
          : {}),
      },
    }),
  ]);

  return { ok: true, alreadyVerified: false };
}
