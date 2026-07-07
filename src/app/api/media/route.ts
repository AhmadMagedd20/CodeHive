import { NextResponse, type NextRequest } from "next/server";
import { storage } from "@/lib/storage";
import { verifySignedMedia } from "@/lib/storage/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves storage objects from a signed, short-lived URL (see storage/signing).
 * Supports HTTP Range so the <video> element can seek. Protected content is
 * served inline (never as an attachment unless dl=1); "no download" is enforced
 * best-effort at the player/viewer level plus the short URL lifetime.
 */
export async function GET(req: NextRequest) {
  const { ok, key, dl } = verifySignedMedia(req.nextUrl.searchParams);
  if (!ok || !key) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  let bytes: Buffer;
  let contentType: string;
  try {
    const obj = await storage.getBytes(key);
    bytes = obj.data;
    contentType = obj.contentType;
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = bytes.length;
  const disposition = dl ? "attachment" : "inline";
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, no-store",
    "Content-Disposition": disposition,
    "X-Content-Type-Options": "nosniff",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : total - 1;
      if (start >= total || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${total}` },
        });
      }
      const chunk = new Uint8Array(bytes.subarray(start, end + 1));
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Length": String(chunk.length),
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(total) },
  });
}
