import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware. Two jobs, both cheap (no DB — session validation happens in
 * the Node runtime via readSession()):
 *   1. In production, force HTTPS (redirect http -> https).
 *   2. Add baseline security headers.
 * The `Secure` cookie flag itself is set where the cookie is created.
 */
export function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      const url = req.nextUrl.clone();
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
