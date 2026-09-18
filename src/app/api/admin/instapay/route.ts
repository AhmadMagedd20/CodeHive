import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { storage, makeStorageKey } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QR_BYTES = 3 * 1024 * 1024;

/** Save InstaPay payment settings (handle + instructions + optional QR image). */
export async function POST(req: NextRequest) {
  let instructor;
  try {
    instructor = await requireInstructor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const instapayHandle = String(form.get("instapayHandle") ?? "").trim() || null;
  const instapayInstructions = String(form.get("instapayInstructions") ?? "").trim() || null;

  let instapayQrAssetId: string | undefined; // undefined = leave unchanged
  const qr = form.get("qr");
  if (qr instanceof File && qr.size > 0) {
    if (!qr.type.startsWith("image/")) {
      return NextResponse.json({ error: "QR must be an image" }, { status: 400 });
    }
    if (qr.size > MAX_QR_BYTES) {
      return NextResponse.json({ error: "Image must be under 3 MB" }, { status: 400 });
    }
    const key = makeStorageKey("instapay", qr.name);
    await storage.put(key, Buffer.from(await qr.arrayBuffer()), { contentType: qr.type });
    const asset = await prisma.fileAsset.create({
      data: {
        provider: storage.name,
        storageKey: key,
        filename: qr.name,
        mimeType: qr.type,
        sizeBytes: qr.size,
      },
    });
    instapayQrAssetId = asset.id;
  }

  await prisma.instructor.update({
    where: { id: instructor.id },
    data: {
      instapayHandle,
      instapayInstructions,
      ...(instapayQrAssetId ? { instapayQrAssetId } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
