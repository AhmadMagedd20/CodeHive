"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validation/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { revokeAllStudentSessions } from "@/lib/auth/session";
import { requireStudent } from "@/lib/auth/current-user";
import { audit } from "@/lib/audit";
import { getClientInfo } from "@/lib/http";
import { zodFieldErrors, type FormState } from "@/lib/form";

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const student = await requireStudent();
  const { ip, userAgent } = getClientInfo();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
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

  const current = await prisma.student.findUnique({ where: { id: student.id } });
  if (!current || !(await verifyPassword(current.passwordHash, parsed.data.currentPassword))) {
    return { ok: false, fieldErrors: { currentPassword: "Current password is incorrect." } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.student.update({ where: { id: student.id }, data: { passwordHash } });

  // Changing the password invalidates ALL sessions (this device included).
  await revokeAllStudentSessions(student.id);
  await audit({
    event: "PASSWORD_CHANGED",
    success: true,
    studentId: student.id,
    ip,
    userAgent,
    message: "changed while signed in",
  });

  redirect("/login?reason=password-changed");
}
