import { randomBytes } from "crypto";
import { prisma } from "../prisma";
import { env } from "../env";
import { hashPassword, verifyPassword } from "../password";
import { gateForState, type LoginGate } from "./account-state";
import { audit } from "../audit";

/**
 * Core authentication logic. Deliberately free of cookies / request context so
 * it can be unit-tested. The login action wraps this and, on success, creates
 * the session cookie.
 *
 * Security properties:
 *  - Generic result for unknown user OR wrong password (no enumeration).
 *  - Constant-ish timing: always runs an argon2 verify, even for unknown users.
 *  - Per-account lockout after MAX_LOGIN_ATTEMPTS failures (students).
 *  - Distinct outcome per account state (via gateForState).
 *  - Explicit 2FA seam after password success, before session issuance.
 */

export type LoginResult =
  | { status: "ok"; principal: { kind: "student" | "instructor"; id: string } }
  | { status: "invalid" }
  | { status: "locked"; retryAfterMinutes: number }
  | { status: "state_blocked"; gate: LoginGate }
  | { status: "two_factor_required"; principal: { kind: "student" | "instructor"; id: string } };

// Cached dummy hash so unknown-user logins still spend argon2 time.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  return (dummyHashPromise ??= hashPassword(`no-user-${randomBytes(16).toString("hex")}`));
}

export async function authenticate(
  identifier: string,
  password: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<LoginResult> {
  const id = identifier.trim().toLowerCase();

  // Students match on email OR username; instructors (admins) on email only.
  const student = await prisma.student.findFirst({
    where: { OR: [{ email: id }, { username: identifier.trim() }] },
  });
  const instructor = student ? null : await prisma.instructor.findUnique({ where: { email: id } });

  // Account lockout (students only) — check before spending a verify.
  if (student?.lockedUntil && student.lockedUntil.getTime() > Date.now()) {
    const retryAfterMinutes = Math.ceil((student.lockedUntil.getTime() - Date.now()) / 60000);
    await audit({
      event: "LOGIN",
      success: false,
      ...meta,
      studentId: student.id,
      emailAttempted: identifier,
      message: "locked",
    });
    return { status: "locked", retryAfterMinutes };
  }

  const hashToCheck = student?.passwordHash ?? instructor?.passwordHash ?? (await getDummyHash());
  const passwordOk = await verifyPassword(hashToCheck, password);

  // Unknown user or wrong password -> identical generic response.
  if ((!student && !instructor) || !passwordOk) {
    if (student) {
      // Count the failure; lock if threshold reached.
      const failed = student.failedLoginCount + 1;
      const lock = failed >= env.MAX_LOGIN_ATTEMPTS;
      await prisma.student.update({
        where: { id: student.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60000) : null,
        },
      });
    }
    await audit({
      event: "LOGIN",
      success: false,
      ...meta,
      studentId: student?.id ?? null,
      emailAttempted: identifier,
      message: "invalid_credentials",
    });
    return { status: "invalid" };
  }

  // Password correct from here on.
  const principal = student
    ? ({ kind: "student", id: student.id } as const)
    : ({ kind: "instructor", id: instructor!.id } as const);

  if (student) {
    // Reset the failure counter on a correct password.
    if (student.failedLoginCount !== 0 || student.lockedUntil) {
      await prisma.student.update({
        where: { id: student.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    // Distinct behaviour per account state.
    const gate = gateForState(student.state, student.rejectionReason);
    if (!gate.allowed) {
      await audit({
        event: "LOGIN",
        success: false,
        ...meta,
        studentId: student.id,
        emailAttempted: identifier,
        message: `state:${gate.code}`,
      });
      return { status: "state_blocked", gate };
    }
  }

  // --- 2FA SEAM -----------------------------------------------------------
  // This is the single, clearly-marked point where a second-factor challenge
  // would be inserted, AFTER password verification and BEFORE session issuance.
  // No 2FA UI/logic exists yet; only reachable if TWO_FACTOR_ENABLED is on and
  // the account opts in. Kept so the flow never needs restructuring later.
  const wantsTwoFactor =
    env.TWO_FACTOR_ENABLED &&
    (student?.requiresTwoFactor || instructor?.requiresTwoFactor || false);
  if (wantsTwoFactor) {
    return { status: "two_factor_required", principal };
  }
  // ------------------------------------------------------------------------

  await audit({
    event: "LOGIN",
    success: true,
    ...meta,
    studentId: student?.id ?? null,
    emailAttempted: identifier,
    message: "success",
  });

  return { status: "ok", principal };
}
