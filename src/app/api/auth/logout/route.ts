import { NextResponse, type NextRequest } from "next/server";
import { destroyCurrentSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { readSession } from "@/lib/auth/session";

/**
 * Manual logout. POST-only (avoids drive-by logout via <img>/GET). Clears the
 * server session + cookie, then redirects to the login page.
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (session.status === "active" && session.student) {
    await audit({ event: "LOGOUT", success: true, studentId: session.student.id });
  }
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/login?reason=loggedout", req.url), { status: 303 });
}
