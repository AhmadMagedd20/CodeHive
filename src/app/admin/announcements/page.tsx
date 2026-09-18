import { Megaphone, Trash2, Globe, BookOpen } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnnouncementForm } from "./announcement-form";
import { deleteAnnouncement } from "./actions";

export const metadata = { title: "Announcements — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const instructor = await requireInstructor();

  const [courses, announcements] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: instructor.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.announcement.findMany({
      where: { instructorId: instructor.id },
      orderBy: [{ sentAt: "desc" }, { publishAt: "asc" }, { createdAt: "desc" }],
      include: {
        course: { select: { title: true } },
        _count: { select: { reads: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-flame shadow-soft">
          <Megaphone className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-subsection">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Post to a single course or everyone. Students are emailed automatically.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New announcement</CardTitle>
          <CardDescription>Compose, optionally attach an image, send now or schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementForm courses={courses} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-card-title">
          Posted <span className="text-muted-foreground">({announcements.length})</span>
        </h2>
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No announcements yet.
            </CardContent>
          </Card>
        ) : (
          announcements.map((a) => {
            const scheduled = !a.sentAt && a.publishAt && a.publishAt > new Date();
            return (
              <Card key={a.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      {a.scope === "GLOBAL" ? (
                        <Badge variant="info">
                          <Globe /> Global
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <BookOpen /> {a.course?.title ?? "Course"}
                        </Badge>
                      )}
                      {scheduled ? (
                        <Badge variant="warning">Scheduled · {a.publishAt!.toLocaleString()}</Badge>
                      ) : (
                        <Badge variant="success">
                          Sent{a.sentAt ? ` · ${a.sentAt.toLocaleDateString()}` : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                    {!scheduled && (
                      <p className="mt-1 text-xs text-muted-foreground">{a._count.reads} read</p>
                    )}
                  </div>
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="announcementId" value={a.id} />
                    <button
                      type="submit"
                      aria-label="Delete announcement"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
