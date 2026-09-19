import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { readSession } from "@/lib/auth/session";

/**
 * Manual logout. POST-only (avoids drive-by logout via <img>/GET). Clears the
 * server session + cookie, then redirects to the login page.
 */
export async function POST() {
  const session = await readSession();
  if (session.status === "active" && session.student) {
    await audit({ event: "LOGOUT", success: true, studentId: session.student.id });
  }
  await destroyCurrentSession();

  /*
   * Redirect with a RELATIVE Location, deliberately.
   *
   * `new URL(path, req.url)` reads as the obvious thing and is wrong behind a
   * proxy. On Render (and most hosts) `req.url` is the INTERNAL address the
   * proxy dialled — http://localhost:10000/api/auth/logout — not the public
   * one, so signing out sent the browser to localhost:10000 and it refused to
   * connect. It looked fine in development only because there localhost really
   * is the public host.
   *
   * A relative Location is resolved by the browser against the URL it actually
   * requested (RFC 7231 §7.1.2), so it is correct on localhost, on
   * *.onrender.com, and on a custom domain later, with nothing to configure.
   */
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login?reason=loggedout" },
  });
}
