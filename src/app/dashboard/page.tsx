import Link from "next/link";
import { ArrowRight, Clock, Sparkles, Play } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/content/visibility";
import { courseProgress } from "@/lib/content/progress";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { categoryFill } from "@/lib/card-fills";
import { CourseFilterGrid, type CourseItem } from "@/components/course-filter-grid";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function fmtMins(seconds?: number | null): string | null {
  if (!seconds) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const student = await requireStudent();

  const grants = await prisma.studentCourseAccess.findMany({
    where: { studentId: student.id, course: { instructorId: student.instructorId } },
    include: { course: true },
    orderBy: { grantedAt: "desc" },
  });
  const grantIds = grants.map((g) => g.courseId);

  const [savedRows, progressList, completed, liveItems, instructor] = await Promise.all([
    prisma.savedCourse.findMany({ where: { studentId: student.id }, select: { courseId: true } }),
    Promise.all(grants.map(async (g) => [g.courseId, await courseProgress(student.id, g.courseId)] as const)),
    prisma.lessonProgress.findMany({
      where: { studentId: student.id, status: "COMPLETED", lessonItem: { module: { courseId: { in: grantIds } } } },
      select: { lessonItemId: true },
    }),
    grantIds.length
      ? prisma.lessonItem.findMany({
          where: { ...liveWhere(), module: { ...liveWhere(), courseId: { in: grantIds } } },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            module: { select: { orderIndex: true, courseId: true, course: { select: { title: true } } } },
            video: { select: { durationSeconds: true } },
          },
        })
      : Promise.resolve([]),
    prisma.instructor.findUnique({ where: { id: student.instructorId }, select: { name: true } }),
  ]);

  const progressByCourse = new Map(progressList);
  const savedSet = new Set(savedRows.map((s) => s.courseId));
  const completedSet = new Set(completed.map((c) => c.lessonItemId));
  const teacher = instructor?.name ?? "Megz";

  // Next incomplete lesson per course → "My next lessons" panel.
  const byCourse = new Map<string, typeof liveItems>();
  for (const it of liveItems) {
    const arr = byCourse.get(it.module.courseId) ?? [];
    arr.push(it);
    byCourse.set(it.module.courseId, arr);
  }
  const nextLessons = grantIds
    .map((cid) => {
      const items = (byCourse.get(cid) ?? []).sort(
        (a, b) => a.module.orderIndex - b.module.orderIndex || a.orderIndex - b.orderIndex,
      );
      let idx = 0;
      const found = items.find((it, i) => {
        idx = i;
        return !completedSet.has(it.id);
      });
      return found ? { item: found, number: idx + 1 } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 5);

  // Momentum promo: an untouched course with content, else any unfinished one.
  const withProgress = grants
    .map((g) => ({ course: g.course, p: progressByCourse.get(g.courseId)! }))
    .filter(({ p }) => p.total > 0);
  const nextUp =
    withProgress.find(({ p }) => p.percent === 0) ?? withProgress.find(({ p }) => p.percent < 100) ?? null;

  const pendingPurchases =
    grants.length === 0
      ? await prisma.purchase.findMany({
          where: { studentId: student.id, status: "PENDING" },
          select: { id: true, course: { select: { title: true } } },
        })
      : [];

  const courseItems: CourseItem[] = grants.map(({ course }) => {
    const p = progressByCourse.get(course.id) ?? { completed: 0, total: 0, percent: 0 };
    const category = course.category ?? "Course";
    return {
      courseId: course.id,
      title: course.title,
      category,
      href: `/courses/${course.id}`,
      cta: p.percent === 0 ? "Start" : "Continue",
      fill: categoryFill(category),
      progress: p.total > 0 ? p : undefined,
      saved: savedSet.has(course.id),
    };
  });

  return (
    <AppShell student={student} active="dashboard">
      {grants.length === 0 ? (
        <div className="rounded-card border-brutal border-ink bg-white p-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sunny">
            <Sparkles className="h-6 w-6 text-ink" />
          </span>
          <p className="font-display text-card-title">You&apos;re in the cohort!</p>
          {pendingPurchases.length > 0 ? (
            <p className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-lilac-soft px-4 py-2.5 text-sm text-lilac-strong">
              <Clock className="h-4 w-4 shrink-0" />
              Your payment for{" "}
              <span className="font-semibold">{pendingPurchases[0].course.title}</span> is under
              review — the course lands here once it&apos;s confirmed.
            </p>
          ) : (
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
              Taking classes with Megz in person? Your lectures appear as you attend. Learning on
              your own? Pick a course from the catalog.
            </p>
          )}
          <Link
            href="/catalog"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-flame px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
          >
            Browse the courses <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>
      ) : (
        <>
          <CourseFilterGrid items={courseItems} />

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* My next lessons — table */}
            <div className="rounded-card border-brutal border-ink bg-white p-5 sm:p-6 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-card-title">My next lessons</h2>
                <Link href="/dashboard" className="text-sm font-semibold text-flame hover:underline">
                  View all lessons
                </Link>
              </div>
              {nextLessons.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">You&apos;re all caught up. 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[30rem]">
                    <thead>
                      <tr className="border-b border-black/5 text-left text-xs font-medium text-ink/45">
                        <th className="pb-2">Lesson</th>
                        <th className="pb-2">Teacher</th>
                        <th className="pb-2 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {nextLessons.map(({ item, number }) => {
                        const dur = fmtMins(item.video?.durationSeconds);
                        return (
                          <tr key={item.id}>
                            <td className="py-3 pr-3">
                              <Link
                                href={`/courses/${item.module.courseId}/lessons/${item.id}`}
                                className="block hover:opacity-80"
                              >
                                <span className="block text-sm font-semibold text-ink">
                                  {String(number).padStart(2, "0")}. {item.title}
                                </span>
                                <span className="block truncate text-xs text-ink/45">
                                  {item.module.course.title}
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 pr-3">
                              <span className="flex items-center gap-2">
                                <Avatar initials={initials(teacher)} size="sm" />
                                <span className="truncate text-sm">{teacher}</span>
                              </span>
                            </td>
                            <td className="py-3 text-right text-sm text-ink/60">{dur ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dark promo — continue where you left off */}
            <aside className="lg:col-span-1">
              {nextUp ? (
                <div className="flex h-full flex-col rounded-card bg-ink p-6 text-white">
                  <span className="w-fit rounded-lg bg-sunny px-3 py-1 text-eyebrow uppercase text-ink">
                    {nextUp.course.university ?? "Course"}
                  </span>
                  <p className="mt-3 text-sm text-white/55">
                    {nextUp.p.percent === 0 ? "Start here" : "Pick up where you left off"}
                  </p>
                  <h3 className="mt-1 font-display text-subsection">
                    {nextUp.course.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/55">
                    {nextUp.p.percent === 0
                      ? "Your first lesson is waiting."
                      : `${nextUp.p.percent}% done — keep the streak going.`}
                  </p>
                  <Link
                    href={`/courses/${nextUp.course.id}`}
                    className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {nextUp.p.percent === 0 ? "Start now" : "Continue"}
                  </Link>
                </div>
              ) : (
                <div className="flex h-full flex-col rounded-card bg-ink p-6 text-white">
                  <span className="w-fit rounded-lg bg-sunny px-3 py-1 text-eyebrow uppercase text-ink">
                    Explore
                  </span>
                  <h3 className="mt-3 font-display text-subsection">
                    Want another course?
                  </h3>
                  <p className="mt-2 text-sm text-white/55">
                    Browse the catalog and add your next one.
                  </p>
                  <Link
                    href="/catalog"
                    className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    Browse courses <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
