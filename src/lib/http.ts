import { headers } from "next/headers";

/**
 * Best-effort client IP + user-agent extraction from request headers. Used for
 * audit logging and rate limiting. Behind a proxy, trust x-forwarded-for's
 * first hop.
 */
export function getClientInfo(): { ip: string; userAgent: string } {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : (h.get("x-real-ip") ?? "unknown");
  const userAgent = h.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}
