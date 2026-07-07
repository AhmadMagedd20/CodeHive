"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";

export async function deleteAnnouncement(formData: FormData) {
  const instructor = await requireInstructor();
  await prisma.announcement.deleteMany({
    where: { id: String(formData.get("announcementId")), instructorId: instructor.id },
  });
  revalidatePath("/admin/announcements");
}
