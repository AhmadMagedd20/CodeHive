import { redirect } from "next/navigation";
import type { Instructor, Student } from "@prisma/client";
import { readSession } from "./session";

/**
 * Route guards for the App Router. Called at the top of protected pages and
 * server actions. Translates the raw session status into a redirect with a
 * user-facing reason, or the authenticated principal.
 */

export type CurrentUser =
  | { kind: "student"; student: Student }
  | { kind: "instructor"; instructor: Instructor }
  | null;

/** Returns the signed-in principal, or null. Never redirects. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await readSession();
  if (res.status !== "active") return null;
  if (res.student) return { kind: "student", student: res.student };
  if (res.instructor) return { kind: "instructor", instructor: res.instructor };
  return null;
}

function loginRedirect(reason?: "elsewhere" | "expired"): never {
  redirect(reason ? `/login?reason=${reason}` : "/login");
}

/** Require a signed-in student, else redirect to /login with the right reason. */
export async function requireStudent(): Promise<Student> {
  const res = await readSession();
  switch (res.status) {
    case "active":
      if (res.student) return res.student;
      // An instructor session hitting a student page -> send to admin.
      redirect("/admin");
    // eslint-disable-next-line no-fallthrough
    case "invalid":
      loginRedirect("elsewhere");
    case "expired":
      loginRedirect("expired");
    case "none":
    default:
      loginRedirect();
  }
}

/** Require a signed-in instructor, else redirect. */
export async function requireInstructor(): Promise<Instructor> {
  const res = await readSession();
  switch (res.status) {
    case "active":
      if (res.instructor) return res.instructor;
      redirect("/dashboard"); // a student hit the admin area
    // eslint-disable-next-line no-fallthrough
    case "invalid":
      loginRedirect("elsewhere");
    case "expired":
      loginRedirect("expired");
    case "none":
    default:
      loginRedirect();
  }
}
