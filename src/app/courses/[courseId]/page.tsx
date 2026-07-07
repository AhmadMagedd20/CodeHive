import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, Lock } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/content/visibility";
import { getModuleLockStates } from "@/lib/content/gating";
import { courseProgress } from "@/lib/content/progress";
import { ProgressBar } from "@/components/progress-bar";
import { AppHeader } from "@/components/app-header";
import { StudentNav } from "@/components/student-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE_META } from "@/components/lesson-type";

export const metadata = { title: "Course" };
export const dynamic = "force-dynamic";

export default async function CourseOutlinePage({ params }: { params: { courseId: string } }) {
  const student = await requireStudent();

  // Enforce course access (Phase 1 grant).
  const access = await prisma.studentCourseAccess.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId: params.courseId } },
  });
  if (!access) notFound();

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      modules: {
        where: liveWhere(),
        orderBy: { orderIndex: "asc" },
        include: { items: { where: liveWhere(), orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const lockStates = await getModuleLockStates(student.id, course.id);
  const progress = await courseProgress(student.id, course.id);
  const totalItems = course.modules.reduce((n, m) => n + m.items.length, 0);

  return (
    <div className="min-h-screen">
      <AppHeader
        email={student.email}
        role="Student"
        nav={<StudentNav studentId={student.id} />}
      />
      <main className="container max-w-3xl py-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>

        <h1 className="font-display text-3xl font-semibold tracking-tight">{course.title}</h1>
        {course.description && <p className="mt-1 text-muted-foreground">{course.description}</p>}

        {progress.total > 0 && (
          <div className="mt-4 rounded-xl border border-bark/10 bg-card p-4 shadow-lift">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-display text-lg font-semibold">
                {progress.percent}%
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">complete</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.completed} of {progress.total} lessons
              </span>
            </div>
            <ProgressBar value={progress.percent} tone={progress.percent === 100 ? "success" : "energy"} />
          </div>
        )}

        {totalItems === 0 ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-16 w-14 items-end justify-center rounded-arch bg-arch-fresh pb-2 shadow-glow">
                <BookOpen className="h-6 w-6 text-cream" />
              </span>
              <p className="font-display text-lg font-semibold">Nothing published yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Lessons will appear here as soon as Megz publishes them. Check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="stagger-children mt-6 space-y-5">
            {course.modules.map((m, mi) => {
              const lock = lockStates.get(m.id);
              const locked = !!lock?.locked;
              return (
                <Card key={m.id} className={locked ? "border-info/30 bg-info-soft/20" : undefined}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2.5 text-lg">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          locked ? "bg-info-soft text-info-strong" : "bg-sage/30 text-bark"
                        }`}
                      >
                        {mi + 1}
                      </span>
                      {m.title}
                      {locked && (
                        <Badge variant="info">
                          <Lock /> Locked
                        </Badge>
                      )}
                    </CardTitle>
                    {locked && lock?.reason ? (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-info-strong">
                        <Lock className="h-3.5 w-3.5" /> {lock.reason}
                      </p>
                    ) : (
                      m.description && (
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                      )
                    )}
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {m.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No lessons yet.</p>
                    ) : (
                      m.items.map((it) => {
                        const { Icon, label } = LESSON_TYPE_META[it.type];
                        if (locked) {
                          return (
                            <div
                              key={it.id}
                              aria-disabled
                              className="flex items-center gap-3 rounded-lg border border-dashed border-info/40 bg-info-soft/30 px-3 py-2.5 text-info-strong/70"
                            >
                              <Lock className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {it.title}
                              </span>
                              <Badge variant="outline" className="hidden opacity-60 sm:inline-flex">
                                {label}
                              </Badge>
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={it.id}
                            href={`/courses/${course.id}/lessons/${it.id}`}
                            className="flex items-center gap-3 rounded-lg border border-bark/10 bg-background px-3 py-2.5 shadow-hairline transition-all duration-200 hover:-translate-y-px hover:border-moss/40 hover:bg-accent/40 hover:shadow-lift"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {it.title}
                            </span>
                            <Badge variant="outline" className="hidden sm:inline-flex">
                              {label}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
