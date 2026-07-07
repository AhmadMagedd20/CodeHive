import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { storage, makeStorageKey } from "@/lib/storage";
import { videoProvider } from "@/lib/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin upload for VIDEO / DOCUMENT lesson items. Video goes through the
 * VideoProvider (local placeholder); documents go straight to storage as a
 * FileAsset. Scoped to the instructor's own item.
 *
 * NOTE: the local video provider buffers the whole file in memory — fine for
 * dev/testing, not for real 2h lectures. A real provider does direct/resumable
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
  const itemId = String(form.get("itemId") ?? "");
  const file = form.get("file");
  if (!itemId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing item or file" }, { status: 400 });
  }

  const item = await prisma.lessonItem.findFirst({
    where: { id: itemId, module: { course: { instructorId: instructor.id } } },
    include: { module: { select: { courseId: true } } },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());

  if (item.type === "VIDEO") {
    const uploaded = await videoProvider.upload({
      data: buf,
      filename: file.name,
      contentType: file.type || "video/mp4",
    });
    await prisma.video.upsert({
      where: { lessonItemId: item.id },
      create: {
        lessonItemId: item.id,
        provider: uploaded.provider,
        providerAssetId: uploaded.providerAssetId,
        storageKey: uploaded.storageKey ?? null,
        status: uploaded.status,
        durationSeconds: uploaded.durationSeconds ?? null,
        originalFilename: file.name,
      },
      update: {
        provider: uploaded.provider,
        providerAssetId: uploaded.providerAssetId,
        storageKey: uploaded.storageKey ?? null,
        status: uploaded.status,
        originalFilename: file.name,
      },
    });
  } else if (item.type === "DOCUMENT") {
    const key = makeStorageKey("documents", file.name);
    await storage.put(key, buf, { contentType: file.type || "application/pdf" });
    const asset = await prisma.fileAsset.create({
      data: {
        provider: storage.name,
        storageKey: key,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        sizeBytes: buf.length,
      },
    });
    await prisma.lessonItem.update({ where: { id: item.id }, data: { documentId: asset.id } });
  } else {
    return NextResponse.json({ error: "Item is not a video or document" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
