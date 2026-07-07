import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { storage, makeStorageKey } from "@/lib/storage";
import { sendAnnouncementEmails } from "@/lib/announcements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Create an announcement (course-specific or global). Optional single image and
 * optional scheduled send. If not scheduled (or the time has already passed) it
 * sends the notification emails immediately and marks `sentAt`; scheduled ones
 * are picked up by /api/cron/tick.
 */
export async function POST(req: NextRequest) {
  let instructor;
  try {
    instructor = await requireInstructor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const scope = String(form.get("scope")) === "GLOBAL" ? "GLOBAL" : "COURSE";
  const courseIdRaw = String(form.get("courseId") ?? "").trim();
  const publishAtRaw = String(form.get("publishAt") ?? "").trim();

  if (!title || !body) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  let courseId: string | null = null;
  if (scope === "COURSE") {
    if (!courseIdRaw) return NextResponse.json({ error: "Choose a course" }, { status: 400 });
    const course = await prisma.course.findFirst({
      where: { id: courseIdRaw, instructorId: instructor.id },
      select: { id: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    courseId = course.id;
  }

  // Optional image.
  let imageAssetId: string | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Attachment must be an image" }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }
    const key = makeStorageKey("announcements", image.name);
    await storage.put(key, Buffer.from(await image.arrayBuffer()), { contentType: image.type });
    const asset = await prisma.fileAsset.create({
      data: {
        provider: storage.name,
        storageKey: key,
        filename: image.name,
        mimeType: image.type,
        sizeBytes: image.size,
      },
    });
    imageAssetId = asset.id;
  }

  const now = new Date();
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;
  const scheduledForFuture = publishAt && !Number.isNaN(publishAt.getTime()) && publishAt > now;

  const announcement = await prisma.announcement.create({
    data: {
      instructorId: instructor.id,
      scope,
      courseId,
      title,
      body,
      imageAssetId,
      publishAt: scheduledForFuture ? publishAt : null,
      sentAt: scheduledForFuture ? null : now, // immediate → mark sent now
    },
  });

  let notified = 0;
  if (!scheduledForFuture) {
    notified = await sendAnnouncementEmails(announcement);
  }

  return NextResponse.json({
    ok: true,
    id: announcement.id,
    scheduled: !!scheduledForFuture,
    notified,
  });
}
