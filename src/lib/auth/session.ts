import { cookies } from "next/headers";
import type { Instructor, Student } from "@prisma/client";
import { prisma } from "../prisma";
import { env, isProd } from "../env";
import { generateToken, hashToken, signSessionValue, unsignSessionValue } from "../tokens";

export const SESSION_COOKIE = "lms_session";

export type Principal = { kind: "student"; id: string } | { kind: "instructor"; id: string };

function inactivityMs() {
  return env.SESSION_INACTIVITY_MINUTES * 60 * 1000;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProd, // Secure flag in production (HTTPS enforced by middleware)
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * DB-only session creation (no cookies) — the testable core of the strict
 * single-session rule. Deletes any existing session for the account first, so
 * the previous device is immediately invalidated, then creates the new one.
 * Returns the raw token (store only its hash server-side).
 */
export async function persistSession(
  principal: Principal,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<string> {
  const token = generateToken();
  const where =
    principal.kind === "student" ? { studentId: principal.id } : { instructorId: principal.id };

  await prisma.$transaction([
    prisma.session.deleteMany({ where }),
    prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + inactivityMs()),
        lastActiveAt: new Date(),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        ...(principal.kind === "student"
          ? { studentId: principal.id }
          : { instructorId: principal.id }),
      },
    }),
  ]);

  return token;
}

/** persistSession + set the signed HTTP-only cookie (used in the login action). */
export async function createSession(
  principal: Principal,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const token = await persistSession(principal, meta);
  cookies().set(SESSION_COOKIE, signSessionValue(token), cookieOptions(inactivityMs() / 1000));
}

export type SessionResult =
  | { status: "none" } // no cookie — not signed in
  | { status: "invalid" } // forged cookie or no matching session — signed in elsewhere / revoked
  | { status: "expired" } // matched a session that lapsed by inactivity
  | { status: "active"; sessionId: string; student: Student | null; instructor: Instructor | null };

/**
 * Validate a raw session token against server-side state (no cookies). Applies
 * sliding inactivity expiry. Testable without a request context.
 */
export async function validateToken(
  token: string,
): Promise<Exclude<SessionResult, { status: "none" }>> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { student: true, instructor: true },
  });

  if (!session) return { status: "invalid" };

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return { status: "expired" };
  }

  // Sliding expiry — extend on activity, throttled to ~once/min to limit writes.
  if (Date.now() - session.lastActiveAt.getTime() > 60_000) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + inactivityMs()) },
      })
      .catch(() => {});
  }

  return {
    status: "active",
    sessionId: session.id,
    student: session.student,
    instructor: session.instructor,
  };
}

/** Read + validate the current request's session cookie. */
export async function readSession(): Promise<SessionResult> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return { status: "none" };
  const token = unsignSessionValue(raw);
  if (!token) return { status: "invalid" }; // tampered / bad signature
  return validateToken(token);
}

/** Clear the current session in DB + cookie (manual logout). */
export async function destroyCurrentSession(): Promise<void> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const token = unsignSessionValue(raw);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookies().delete(SESSION_COOKIE);
}

/** Drop just the cookie (when we detect an invalid/expired session). */
export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Invalidate every session for a student (password change/reset). */
export async function revokeAllStudentSessions(studentId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { studentId } });
}
