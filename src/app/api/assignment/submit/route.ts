import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isLive } from "@/lib/content/visibility";
import { storage, makeStorageKey } from "@/lib/storage";
import { isCodeLanguage } from "@/components/code-editor-langs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

/**
 * Student assignment submission (multipart form). Mode must match the
 * assignment's configured mode. Every submission is timestamped, late-flagged
 * against the due date, and numbered (attemptNo) — resubmission needs no admin
 * intervention.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.kind !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const student = user.student;

  const form = await req.formData();
  const assignmentId = String(form.get("assignmentId") ?? "");
  if (!assignmentId) return NextResponse.json({ error: "Missing assignment" }, { status: 400 });

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { lessonItem: { include: { module: true } } },
  });
  if (!assignment || !isLive(assignment.lessonItem) || !isLive(assignment.lessonItem.module)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await prisma.studentCourseAccess.findUnique({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: assignment.lessonItem.module.courseId,
      },
    },
  });
  if (!access) return NextResponse.json({ error: "No access" }, { status: 403 });

  const now = new Date();
  const isLate = !!assignment.dueAt && now > assignment.dueAt;
  const attemptNo =
    (await prisma.submission.count({
      where: { assignmentId: assignment.id, studentId: student.id },
    })) + 1;

  let codeContent: string | null = null;
  let codeLanguage: string | null = null;
  let fileAssetId: string | null = null;

  if (assignment.submissionMode === "CODE") {
    codeContent = String(form.get("code") ?? "");
    if (!codeContent.trim()) return NextResponse.json({ error: "Code is empty" }, { status: 400 });
    if (codeContent.length > 200_000) {
      return NextResponse.json({ error: "Code is too large" }, { status: 400 });
    }
    const langRaw = String(form.get("language") ?? "plain");
    codeLanguage = isCodeLanguage(langRaw) ? langRaw : "plain";
  } else {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Attach a file to submit" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File is larger than 25 MB" }, { status: 400 });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json({ error: "Only PDF, images, or zip files are accepted" }, { status: 400 });
    }
    const key = makeStorageKey(`submissions/${assignment.id}`, file.name);
    await storage.put(key, Buffer.from(await file.arrayBuffer()), { contentType: mime });
    const asset = await prisma.fileAsset.create({
      data: {
        provider: storage.name,
        storageKey: key,
        filename: file.name,
        mimeType: mime,
        sizeBytes: file.size,
      },
    });
    fileAssetId = asset.id;
  }

  const submission = await prisma.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: student.id,
      attemptNo,
      isLate,
      mode: assignment.submissionMode,
      codeContent,
      codeLanguage,
      fileAssetId,
    },
  });

  await prisma.$transaction([
    prisma.student.update({
      where: { id: student.id },
      data: { lastLearningActivityAt: now },
    }),
    // Submitting completes the assignment's lesson item (feeds course progress).
    prisma.lessonProgress.upsert({
      where: {
        studentId_lessonItemId: { studentId: student.id, lessonItemId: assignment.lessonItemId },
      },
      create: {
        studentId: student.id,
        lessonItemId: assignment.lessonItemId,
        status: "COMPLETED",
        completedAt: now,
      },
      update: { status: "COMPLETED", completedAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true, submissionId: submission.id, attemptNo, isLate });
}
