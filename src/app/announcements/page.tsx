import Image from "next/image";
import { Megaphone, Globe, BookOpen } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import { storage } from "@/lib/storage";
import { AppHeader } from "@/components/app-header";
import { StudentNav } from "@/components/student-nav";
import { Markdown } from "@/components/markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen">
      <AppHeader
        email={student.email}
        role="Student"
        nav={<StudentNav studentId={student.id} active="announcements" />}
      />
      <main className="container max-w-2xl py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-10 items-end justify-center rounded-arch bg-arch-warm pb-1.5 shadow-glow-gold">
            <Megaphone className="h-5 w-5 text-cream" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Announcements</h1>
            <p className="text-sm text-muted-foreground">Updates from Megz across your cohort.</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-16 w-14 items-end justify-center rounded-arch bg-sage/25 pb-2">
                <Megaphone className="h-6 w-6 text-moss" />
              </span>
              <p className="font-display text-lg font-semibold">Nothing here yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Announcements from your courses and the wider cohort will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="stagger-children space-y-4">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-3 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.scope === "GLOBAL" ? (
                      <Badge variant="info">
                        <Globe /> All cohorts
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <BookOpen /> {a.course?.title ?? "Course"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {a.sentAt?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-semibold">{a.title}</h2>
                  {imageUrls.has(a.id) && (
                    <Image
                      src={imageUrls.get(a.id)!}
                      alt=""
                      width={1200}
                      height={630}
                      unoptimized
                      className="w-full rounded-lg border border-bark/10 object-cover"
                    />
                  )}
                  <Markdown content={a.body} className="text-sm" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
