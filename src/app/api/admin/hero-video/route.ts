import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { storage, makeStorageKey } from "@/lib/storage";
import { videoProvider } from "@/lib/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_POSTER_BYTES = 5 * 1024 * 1024;

/**
 * Set (or clear) the landing hero's preview video — a standalone PUBLIC
 * marketing asset. It uses the VideoProvider purely for upload/streaming
 * mechanics; it is NOT a lesson, has no course, and gets none of the course
 * protection (watermark / no-download / gating) by design.
 *
 * NOTE: like the lesson upload, the local provider buffers the whole file in
 * memory — fine for a short hero clip, and a real provider would do direct
 * client uploads (PROJECT.md Phase 2).
 */
export async function POST(req: NextRequest) {
  let instructor;
  try {
    instructor = await requireInstructor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();

  // Clearing sends the hero back to its static mock.
  if (String(form.get("remove") ?? "") === "1") {
    await prisma.instructor.update({
      where: { id: instructor.id },
      data: {
        heroVideoProvider: null,
        heroVideoAssetId: null,
        heroVideoStorageKey: null,
        heroVideoStatus: null,
        heroVideoFilename: null,
        heroPosterAssetId: null,
      },
    });
    return NextResponse.json({ ok: true, removed: true });
  }

  const file = form.get("video");
  const poster = form.get("poster");
  const hasVideo = file instanceof File && file.size > 0;
  const hasPoster = poster instanceof File && poster.size > 0;
  if (!hasVideo && !hasPoster) {
    return NextResponse.json({ error: "Choose a video (or a poster image)" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (hasVideo) {
    const v = file as File;
    if (!v.type.startsWith("video/")) {
      return NextResponse.json({ error: "That file isn't a video" }, { status: 400 });
    }
    if (v.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video must be under 200 MB" }, { status: 400 });
    }
    const uploaded = await videoProvider.upload({
      data: Buffer.from(await v.arrayBuffer()),
      filename: v.name,
      contentType: v.type,
    });
    data.heroVideoProvider = uploaded.provider;
    data.heroVideoAssetId = uploaded.providerAssetId;
    data.heroVideoStorageKey = uploaded.storageKey ?? null;
    data.heroVideoStatus = uploaded.status;
    data.heroVideoFilename = v.name;
  }

  if (hasPoster) {
    const p = poster as File;
    if (!p.type.startsWith("image/")) {
      return NextResponse.json({ error: "The poster must be an image" }, { status: 400 });
    }
    if (p.size > MAX_POSTER_BYTES) {
      return NextResponse.json({ error: "Poster must be under 5 MB" }, { status: 400 });
    }
    const key = makeStorageKey("hero", p.name);
    await storage.put(key, Buffer.from(await p.arrayBuffer()), { contentType: p.type });
    const asset = await prisma.fileAsset.create({
      data: {
        provider: storage.name,
        storageKey: key,
        filename: p.name,
        mimeType: p.type,
        sizeBytes: p.size,
      },
    });
    data.heroPosterAssetId = asset.id;
  }

  await prisma.instructor.update({ where: { id: instructor.id }, data });
  return NextResponse.json({ ok: true });
}
