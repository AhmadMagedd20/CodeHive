import type { AuditEvent } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Append-only audit trail. Every login attempt is recorded (success/fail, IP,
 * UA). studentId is null when the email didn't match a real account, so the
 * log never reveals whether an address is registered.
 */
export async function audit(entry: {
  event: AuditEvent;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  studentId?: string | null;
  emailAttempted?: string | null;
  message?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event: entry.event,
        success: entry.success,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        studentId: entry.studentId ?? null,
        emailAttempted: entry.emailAttempted ?? null,
        message: entry.message ?? null,
      },
    });
  } catch (err) {
    // Auditing must never break the primary flow.
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write log:", err);
  }
}
