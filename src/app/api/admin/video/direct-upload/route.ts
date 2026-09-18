import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { videoProvider } from "@/lib/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a browser-direct upload ticket for a VIDEO lesson item.
 *
 * This route deliberately never touches the file. It creates the empty video
 * object at the provider, returns a signature scoped to that one video and
 * expiry, and the browser streams the bytes itself — see the architecture note
 * in `lib/video/bunny.ts`. Runtime here is milliseconds regardless of whether
 * the lecture is 40 MB or 4 GB.
 *
 * The provider API key never appears in the response.
 */
export async function POST(req: NextRequest) {
  let instructor;
  try {
    instructor = await requireInstructor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!videoProvider.createDirectUpload) {
    return NextResponse.json(
      {
        error: `The "${videoProvider.name}" video provider has no direct upload. Set VIDEO_PROVIDER=bunny, or use the normal upload in development.`,
      },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    itemId?: string;
    filename?: string;
    contentType?: string;
  } | null;
  const itemId = body?.itemId?.trim();
  const filename = body?.filename?.trim() || "lecture.mp4";
  if (!itemId) return NextResponse.json({ error: "Missing item" }, { status: 400 });

  const item = await prisma.lessonItem.findFirst({
    where: { id: itemId, type: "VIDEO", module: { course: { instructorId: instructor.id } } },
    select: { id: true, title: true },
  });
  if (!item) return NextResponse.json({ error: "Video lesson not found" }, { status: 404 });

  let ticket;
  try {
    ticket = await videoProvider.createDirectUpload({
      filename,
      contentType: body?.contentType || "video/mp4",
      title: item.title,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // PENDING means "object created, bytes not received". If the admin closes
  // the tab mid-upload it stays PENDING, which the UI renders as an
  // incomplete upload with a retry — never as "processing" forever.
  await prisma.video.upsert({
    where: { lessonItemId: item.id },
    create: {
      lessonItemId: item.id,
      provider: ticket.provider,
      providerAssetId: ticket.providerAssetId,
      status: "PENDING",
      originalFilename: filename,
    },
    update: {
      provider: ticket.provider,
      providerAssetId: ticket.providerAssetId,
      storageKey: null,
      status: "PENDING",
      originalFilename: filename,
    },
  });

  return NextResponse.json({
    endpoint: ticket.endpoint,
    headers: ticket.headers,
    metadata: ticket.metadata,
    expiresAt: ticket.expiresAt,
  });
}
