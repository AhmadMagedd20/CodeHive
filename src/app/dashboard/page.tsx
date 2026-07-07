import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { StudentNav } from "@/components/student-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { courseProgress } from "@/lib/content/progress";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const student = await requireStudent();

  // Students only ever see courses they've been explicitly granted, scoped to
  // their instructor (multi-tenant safe).
  const grants = await prisma.studentCourseAccess.findMany({
    where: { studentId: student.id, course: { instructorId: student.instructorId } },
    include: { course: true },
    orderBy: { grantedAt: "desc" },
  });

  const progressByCourse = new Map(
    await Promise.all(
      grants.map(async (g) => [g.courseId, await courseProgress(student.id, g.courseId)] as const),
    ),
  );

  return (
    <div className="min-h-screen">
      <AppHeader
        email={student.email}
        role="Student"
        nav={<StudentNav studentId={student.id} active="dashboard" />}
      />
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">My courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, {student.username}. Here are the courses you have access to.
          </p>
        </div>

        {grants.length === 0 ? (
          <Card className="texture-grain overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <span className="mb-4 flex h-20 w-16 animate-pop items-end justify-center rounded-arch bg-arch-fresh pb-3 shadow-glow">
                <BookOpen className="h-7 w-7 text-cream" />
              </span>
              <p className="font-display text-lg font-semibold">You&apos;re in the cohort!</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Your courses will show up here as soon as they&apos;re assigned. You&apos;ll get an
                email the moment access is granted.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {grants.map(({ course, grantedAt }) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="group block">
                <Card className="relative h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:border-moss/40 group-hover:shadow-raised">
                  <span
                    aria-hidden
                    className="absolute -bottom-8 right-6 h-20 w-14 rounded-arch bg-arch-warm opacity-70 transition-all duration-300 group-hover:-bottom-5 group-hover:opacity-100"
                  />
                  <CardHeader className="relative">
                    <CardTitle className="font-display text-lg">{course.title}</CardTitle>
                    {course.description && <CardDescription>{course.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="relative space-y-3">
                    {(() => {
                      const p = progressByCourse.get(course.id) ?? { completed: 0, total: 0, percent: 0 };
                      return (
                        <div>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">
                              {p.percent}% complete
                            </span>
                            <span className="text-muted-foreground">
                              {p.completed}/{p.total} lessons
                            </span>
                          </div>
                          <ProgressBar value={p.percent} tone={p.percent === 100 ? "success" : "energy"} />
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Granted {grantedAt.toLocaleDateString()}
                      </p>
                      <span className="relative z-10 flex items-center gap-1 text-sm font-semibold text-bark opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                        Open <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
