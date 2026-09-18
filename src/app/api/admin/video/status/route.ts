import { NextResponse, type NextRequest } from "next/server";
import type { VideoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { videoProvider } from "@/lib/video";
import { bunnyEncodeProgress } from "@/lib/video/bunny";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Report an upload's outcome, and poll transcoding progress.
 *
 * POST — the browser tells us how the direct upload ended:
 *   { itemId, ok: true }  → bytes delivered; hand over to the provider's
 *                           transcoder (PROCESSING)
 *   { itemId, ok: false } → the upload failed; mark ERROR so the admin sees a
 *                           retry instead of a lesson wedged in "processing"
 *
 * GET ?itemId= — current state, refreshed from the provider.
 */

export async function POST(req: NextRequest) {
  let instructor;
  try {
    instructor = await requireInstructor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    itemId?: string;
    ok?: boolean;
    durationSeconds?: number;
  } | null;
  const itemId = body?.itemId?.trim();
  if (!itemId) return NextResponse.json({ error: "Missing item" }, { status: 400 });

  const video = await prisma.video.findFirst({
    where: { lessonItemId: itemId, lessonItem: { module: { course: { instructorId: instructor.id } } } },
    select: { id: true },
  });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  await prisma.video.update({
    where: { id: video.id },
    data: {
      status: body?.ok ? "PROCESSING" : "ERROR",
      ...(body?.durationSeconds ? { durationSeconds: Math.round(body.durationSeconds) } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  let instructor;
  try {
    instructor = await requireInstructor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = req.nextUrl.searchParams.get("itemId")?.trim();
  if (!itemId) return NextResponse.json({ error: "Missing item" }, { status: 400 });

  const video = await prisma.video.findFirst({
    where: { lessonItemId: itemId, lessonItem: { module: { course: { instructorId: instructor.id } } } },
    select: { id: true, provider: true, providerAssetId: true, storageKey: true, status: true },
  });
  if (!video) return NextResponse.json({ status: "NONE" });

  // A PENDING row means the object exists but bytes never arrived — asking the
  // provider would just echo that back, so report it as-is. It's the "tab
  // closed mid-upload" state and needs a retry, not a wait.
  if (video.status === "PENDING" || video.status === "ERROR") {
    return NextResponse.json({ status: video.status, progress: null });
  }

  // Widened explicitly: the early return above narrows `video.status` to
  // PROCESSING | READY, but the provider can hand back any VideoStatus.
  let status: VideoStatus = video.status;
  try {
    status = await videoProvider.getStatus(video);
    if (status !== video.status) {
      await prisma.video.update({ where: { id: video.id }, data: { status } });
    }
  } catch {
    /* transient provider error — keep the stored status */
  }

  let progress: number | null = null;
  if (status === "PROCESSING" && video.provider === "bunny" && video.providerAssetId) {
    progress = await bunnyEncodeProgress(video.providerAssetId).catch(() => null);
  }

  return NextResponse.json({ status, progress });
}
