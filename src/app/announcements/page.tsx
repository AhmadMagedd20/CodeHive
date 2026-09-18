import Image from "next/image";
import { Megaphone, Globe, BookOpen } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import { storage } from "@/lib/storage";
import { AppShell } from "@/components/app-shell";
import { Markdown } from "@/components/markdown";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsFeedPage() {
  const student = await requireStudent();

  const where = await visibleAnnouncementsWhere(student.id);
  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: { sentAt: "desc" },
    include: { course: { select: { title: true } }, imageAsset: true },
    take: 100,
  });

  // Mark everything in the feed as read (clears the unread badge).
  if (announcements.length > 0) {
    await prisma.announcementRead.createMany({
      data: announcements.map((a) => ({ announcementId: a.id, studentId: student.id })),
      skipDuplicates: true,
    });
  }

  // Sign image URLs server-side.
  const imageUrls = new Map<string, string>();
  for (const a of announcements) {
    if (a.imageAsset) imageUrls.set(a.id, await storage.getUrl(a.imageAsset.storageKey));
  }

  return (
    <AppShell student={student} active="announcements">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sunny">
            <Megaphone className="h-5 w-5 text-ink" />
          </span>
          <div>
            <h1 className="font-display text-subsection">Announcements</h1>
            <p className="text-sm text-ink/55">Updates from Megz across your cohort.</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="rounded-card border-brutal border-ink bg-white p-12 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lilac">
              <Megaphone className="h-6 w-6 text-ink" />
            </span>
            <p className="font-display text-lg font-extrabold tracking-display">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink/55">
              Announcements from your courses and the wider cohort will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className="space-y-3 rounded-card border-brutal border-ink bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {a.scope === "GLOBAL" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-lilac px-2.5 py-1 text-[11px] font-semibold text-ink">
                      <Globe className="h-3 w-3" /> All cohorts
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky px-2.5 py-1 text-[11px] font-semibold text-ink">
                      <BookOpen className="h-3 w-3" /> {a.course?.title ?? "Course"}
                    </span>
                  )}
                  <span className="text-xs text-ink/45">
                    {a.sentAt?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <h2 className="font-display text-lg font-extrabold tracking-display">{a.title}</h2>
                {imageUrls.has(a.id) && (
                  <Image
                    src={imageUrls.get(a.id)!}
                    alt=""
                    width={1200}
                    height={630}
                    unoptimized
                    className="w-full rounded-2xl border-brutal border-ink object-cover"
                  />
                )}
                <Markdown content={a.body} className="text-sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
