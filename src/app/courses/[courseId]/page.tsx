import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock, Coins, Sparkles } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/content/visibility";
import {
  getEffectiveModuleLockStates,
  getCourseItemLocks,
  UNOWNED_LOCK_REASON,
} from "@/lib/content/access";
import { publicPriceCents, formatPrice } from "@/lib/money";
import { courseProgress } from "@/lib/content/progress";
import { AppShell } from "@/components/app-shell";
import { LESSON_TYPE_META } from "@/components/lesson-type";
import { cn } from "@/lib/utils";

export const metadata = { title: "Course" };
export const dynamic = "force-dynamic";

export default async function CourseOutlinePage({ params }: { params: { courseId: string } }) {
  const student = await requireStudent();

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

  const [lockStates, itemLocks, progress] = await Promise.all([
    getEffectiveModuleLockStates(student.id, course.id),
    getCourseItemLocks(student.id, course.id),
    courseProgress(student.id, course.id),
  ]);
  const totalItems = course.modules.reduce((n, m) => n + m.items.length, 0);

  return (
    <AppShell student={student} active="dashboard">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> All courses
      </Link>

      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-section">{course.title}</h1>
        {course.description && <p className="mt-1 text-ink/55">{course.description}</p>}

        {progress.total > 0 && (
          <div className="mt-5 rounded-card border-brutal border-ink bg-white p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-display text-card-title">
                {progress.percent}%
                <span className="ml-1.5 text-sm font-medium text-ink/45">complete</span>
              </span>
              <span className="text-sm text-ink/45">
                {progress.completed} of {progress.total} lessons
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-flame" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}

        {totalItems === 0 ? (
          <div className="mt-6 rounded-card border-brutal border-ink bg-white p-12 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sunny">
              <Sparkles className="h-6 w-6 text-ink" />
            </span>
            <p className="font-display text-lg font-extrabold tracking-display">Nothing published yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink/55">
              Lessons appear here as soon as Megz publishes them. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {course.modules.map((m, mi) => {
              const lock = lockStates.get(m.id);
              const locked = !!lock?.locked;
              // A week they simply haven't bought reads as an offer (sunny),
              // not a punishment — drip/gating locks stay lilac.
              const unowned = lock?.reason === UNOWNED_LOCK_REASON;
              const weekPrice = publicPriceCents(m);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-card border bg-white p-5",
                    unowned
                      ? "border-sunny/50 bg-sunny-soft/40"
                      : locked
                        ? "border-lilac/40 bg-lilac-soft/40"
                        : "border-black/5",
                  )}
                >
                  <div className="mb-3">
                    {/* Same rule as the catalog: title left, week action right,
                        no wrapping — so every week row lines up identically. */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                            unowned ? "bg-sunny text-ink" : locked ? "bg-lilac text-ink" : "bg-ink text-white",
                          )}
                        >
                          {mi + 1}
                        </span>
                        <h2 className="min-w-0 font-display text-lg font-extrabold tracking-display">{m.title}</h2>
                        {locked && !unowned && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lilac px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>
                      {unowned && weekPrice != null && (
                        <Link
                          href={`/purchase/${course.id}?module=${m.id}`}
                          className="inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-full border-brutal border-ink bg-flame px-3.5 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 sm:self-auto"
                        >
                          <Coins className="h-3.5 w-3.5" /> Buy this week ·{" "}
                          {formatPrice(weekPrice, course.currency)}
                        </Link>
                      )}
                    </div>
                    {unowned ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-sunny-strong">
                        <Coins className="h-3.5 w-3.5" />
                        {weekPrice != null
                          ? "Not yours yet — buy this week on its own, or get the full course."
                          : "Available as part of the full course."}
                      </p>
                    ) : locked && lock?.reason ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-lilac-strong">
                        <Lock className="h-3.5 w-3.5" /> {lock.reason}
                      </p>
                    ) : (
                      m.description && <p className="mt-1.5 text-sm text-ink/55">{m.description}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {m.items.length === 0 ? (
                      <p className="text-sm text-ink/45">No lessons yet.</p>
                    ) : (
                      m.items.map((it) => {
                        const { Icon, label } = LESSON_TYPE_META[it.type];
                        const iLock = itemLocks.get(it.id);

                        if (iLock?.locked && iLock.kind === "extra") {
                          return (
                            <Link
                              key={it.id}
                              href={`/purchase/${course.id}`}
                              className="flex items-center gap-3 rounded-2xl border border-sunny/50 bg-sunny-soft px-3 py-2.5 text-sunny-strong transition-transform hover:-translate-y-px"
                            >
                              <Coins className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {it.title}
                              </span>
                              <span className="rounded-full bg-sunny px-2.5 py-0.5 text-[11px] font-bold text-ink">
                                Unlock extra
                              </span>
                            </Link>
                          );
                        }

                        if (iLock?.locked) {
                          return (
                            <div
                              key={it.id}
                              className="flex items-center gap-3 rounded-2xl border border-dashed border-lilac/50 bg-white/60 px-3 py-2.5 text-ink/40"
                            >
                              <Lock className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {it.title}
                              </span>
                              <span className="hidden text-xs sm:inline">{label}</span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={it.id}
                            href={`/courses/${course.id}/lessons/${it.id}`}
                            className="flex items-center gap-3 rounded-2xl border-brutal border-ink bg-paper px-3 py-2.5 transition-colors hover:border-flame/30 hover:bg-flame-soft/40"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-ink/70">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {it.title}
                            </span>
                            {it.isExtra && (
                              <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-ink">
                                Extra
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4 text-ink/40" />
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
