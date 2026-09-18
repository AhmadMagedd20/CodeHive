import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock, Coins, ListVideo, Clock, ArrowRight } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { isLive, liveWhere } from "@/lib/content/visibility";
import { getItemLock, getCourseItemLocks } from "@/lib/content/access";
import { parseChapters, fmtTime } from "@/lib/chapters";
import { videoProvider } from "@/lib/video";
import { storage } from "@/lib/storage";
import { AppShell } from "@/components/app-shell";
import { Markdown } from "@/components/markdown";
import { VideoPlayer } from "@/components/video-player";
import { PdfViewer } from "@/components/pdf-viewer";
import { CompleteButton } from "@/components/complete-button";
import { QuizPanel } from "@/components/quiz-panel";
import { AssignmentPanel, type SubmissionDTO } from "@/components/assignment-panel";
import { LessonSidebar, type SidebarModule } from "@/components/lesson-sidebar";
import { LESSON_TYPE_META } from "@/components/lesson-type";

export const metadata = { title: "Lesson" };
export const dynamic = "force-dynamic";

function durLabel(s?: number | null): string | null {
  if (!s) return null;
  return `${Math.max(1, Math.round(s / 60))}m`;
}

export default async function LessonPage({
  params,
}: {
  params: { courseId: string; itemId: string };
}) {
  const student = await requireStudent();

  const [access, course] = await Promise.all([
    prisma.studentCourseAccess.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: params.courseId } },
    }),
    prisma.course.findUnique({ where: { id: params.courseId }, select: { title: true } }),
  ]);
  if (!access || !course) notFound();

  const item = await prisma.lessonItem.findFirst({
    where: { id: params.itemId, module: { courseId: params.courseId } },
    include: { module: true, video: true, document: true },
  });
  if (!item || !isLive(item) || !isLive(item.module)) notFound();

  const lock = await getItemLock(student.id, params.courseId, item.id);
  if (lock.locked) {
    const isUnowned = lock.kind === "unowned";
    // Both "paid extra" and "week you haven't bought" are buy-to-unlock states,
    // so they share the sunny treatment; drip/gating locks stay lilac.
    const isExtra = lock.kind === "extra" || isUnowned;
    return (
      <AppShell student={student} active="dashboard">
        <Link
          href={`/courses/${params.courseId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Back to course
        </Link>
        <div
          className={`mx-auto max-w-lg rounded-card border p-10 text-center ${
            isExtra ? "border-sunny/40 bg-sunny-soft" : "border-lilac/40 bg-lilac-soft"
          }`}
        >
          <span
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
              isExtra ? "bg-sunny text-ink" : "bg-lilac text-ink"
            }`}
          >
            {isExtra ? <Coins className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </span>
          <p className="font-display text-card-title">
            {isUnowned
              ? "You haven't bought this week"
              : isExtra
                ? "Paid extra material"
                : "This lesson is locked"}
          </p>
          <p className={`mt-1.5 text-sm ${isExtra ? "text-sunny-strong" : "text-lilac-strong"}`}>
            {isUnowned ? "Buy this week on its own, or get the full course." : lock.reason}
          </p>
          {isExtra && (
            <Link
              href={
                isUnowned
                  ? `/purchase/${params.courseId}?module=${item.moduleId}`
                  : `/purchase/${params.courseId}`
              }
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-flame px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Coins className="h-4 w-4" /> {isUnowned ? "Buy this week" : "Unlock the extras"}
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  // Full outline (for the sidebar + prev/next), item locks, completion.
  const [modules, itemLocks, completedRows] = await Promise.all([
    prisma.module.findMany({
      where: { courseId: params.courseId, ...liveWhere() },
      orderBy: { orderIndex: "asc" },
      include: {
        items: {
          where: liveWhere(),
          orderBy: { orderIndex: "asc" },
          select: { id: true, title: true, type: true, video: { select: { durationSeconds: true } } },
        },
      },
    }),
    getCourseItemLocks(student.id, params.courseId),
    prisma.lessonProgress.findMany({
      where: { studentId: student.id, status: "COMPLETED", lessonItem: { module: { courseId: params.courseId } } },
      select: { lessonItemId: true },
    }),
  ]);
  const completedSet = new Set(completedRows.map((c) => c.lessonItemId));

  const flat = modules.flatMap((m) => m.items);
  const idx = flat.findIndex((i) => i.id === item.id);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  const totalDurationSec = flat.reduce((n, it) => n + (it.video?.durationSeconds ?? 0), 0);

  const sidebar: SidebarModule[] = modules.map((m, mi) => ({
    id: m.id,
    number: mi + 1,
    title: m.title,
    count: m.items.length,
    items: m.items.map((it) => {
      const l = itemLocks.get(it.id);
      return {
        id: it.id,
        title: it.title,
        duration: durLabel(it.video?.durationSeconds),
        locked: !!l?.locked,
        lockKind: l?.kind ?? null,
        completed: completedSet.has(it.id),
        current: it.id === item.id,
      };
    }),
  }));

  const progress = await prisma.lessonProgress.findUnique({
    where: { studentId_lessonItemId: { studentId: student.id, lessonItemId: item.id } },
  });

  const { Icon, label } = LESSON_TYPE_META[item.type];
  const watermark = `${student.fullName ?? student.username} · ${student.email}`;
  const chapters = item.type === "VIDEO" ? parseChapters(item.chapters) : [];

  const videoUrl =
    item.type === "VIDEO" && item.video ? await videoProvider.getStreamUrl(item.video) : null;
  const docUrl =
    item.type === "DOCUMENT" && item.document ? await storage.getUrl(item.document.storageKey) : null;

  // Assignment data.
  let assignmentData: {
    panel: React.ComponentProps<typeof AssignmentPanel>;
    instructions: string | null;
  } | null = null;
  if (item.type === "ASSIGNMENT") {
    const assignment = await prisma.assignment.findUnique({ where: { lessonItemId: item.id } });
    if (assignment) {
      const submissions = await prisma.submission.findMany({
        where: { assignmentId: assignment.id, studentId: student.id },
        orderBy: { attemptNo: "desc" },
        include: { fileAsset: { select: { filename: true } } },
      });
      const dtos: SubmissionDTO[] = submissions.map((s) => ({
        id: s.id,
        attemptNo: s.attemptNo,
        submittedAt: s.submittedAt.toISOString(),
        isLate: s.isLate,
        released: s.releasedAt ? { passed: s.passed, score: s.score, feedback: s.feedback } : null,
        filename: s.fileAsset?.filename ?? null,
      }));
      assignmentData = {
        instructions: assignment.instructions,
        panel: {
          assignmentId: assignment.id,
          mode: assignment.submissionMode,
          defaultLanguage: assignment.codeLanguage,
          dueAt: assignment.dueAt?.toISOString() ?? null,
          isGating: assignment.isGating,
          submissions: dtos,
        },
      };
    }
  }

  // Quiz data (correct answers never sent).
  let quizData: React.ComponentProps<typeof QuizPanel> | null = null;
  if (item.type === "QUIZ") {
    const quiz = await prisma.quiz.findUnique({
      where: { lessonItemId: item.id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (quiz) {
      const attempts = await prisma.quizAttempt.findMany({
        where: { quizId: quiz.id, studentId: student.id },
        orderBy: { attemptNo: "asc" },
      });
      const now = new Date();
      quizData = {
        quizId: quiz.id,
        instructions: quiz.instructions,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          points: q.points,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
        })),
        attemptsUsed: attempts.length,
        maxAttempts: quiz.maxAttempts,
        isOpen: !quiz.opensAt || now >= quiz.opensAt,
        isClosed: !!quiz.closesAt && now > quiz.closesAt,
        timeLimitMinutes: quiz.timeLimitMinutes,
        pastAttempts: attempts.map((a) => ({
          attemptNo: a.attemptNo,
          status: a.status,
          score: a.score,
          maxScore: a.maxScore,
          submittedAt: a.submittedAt?.toISOString() ?? null,
        })),
      };
    }
  }

  const StatChip = ({ icon: I, children }: { icon: typeof ListVideo; children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sunny px-3 py-1.5 text-xs font-semibold text-ink">
      <I className="h-3.5 w-3.5" /> {children}
    </span>
  );

  return (
    <AppShell student={student} active="dashboard">
      {/* Breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-ink/50">
        <Link href="/dashboard" className="hover:text-ink">My courses</Link>
        <span>/</span>
        <Link href={`/courses/${params.courseId}`} className="hover:text-ink">{course.title}</Link>
        <span>/</span>
        <span className="font-medium text-ink">{item.title}</span>
      </nav>

      {/* Heading + stat chips */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${params.courseId}`}
            aria-label="Back to course"
            className="flex h-9 w-9 items-center justify-center rounded-full border-brutal border-ink bg-white text-ink hover:bg-paper"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-subsection">{course.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={ListVideo}>
            {flat.length} {flat.length === 1 ? "lesson" : "lessons"}
          </StatChip>
          {totalDurationSec > 0 && <StatChip icon={Clock}>{fmtTime(totalDurationSec)}</StatChip>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Main column */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-eyebrow uppercase text-white">
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <span className="text-eyebrow uppercase text-ink/45">{item.module.title}</span>
          </div>
          <h2 className="mb-4 font-display text-card-title">
            {item.title}
          </h2>

          {item.type === "VIDEO" &&
            (videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                watermark={watermark}
                lessonItemId={item.id}
                initialPosition={progress?.lastPositionSeconds ?? 0}
                chapters={chapters}
              />
            ) : (
              <div className="rounded-card border-brutal border-ink bg-white py-12 text-center text-ink/50">
                This video hasn&apos;t been uploaded yet.
              </div>
            ))}

          {item.type === "DOCUMENT" &&
            (docUrl ? (
              <PdfViewer src={docUrl} watermark={watermark} />
            ) : (
              <div className="rounded-card border-brutal border-ink bg-white py-12 text-center text-ink/50">
                This document hasn&apos;t been uploaded yet.
              </div>
            ))}

          {item.type === "RICH_TEXT" && (
            <div className="rounded-card border-brutal border-ink bg-white p-6">
              {item.body ? (
                <Markdown content={item.body} />
              ) : (
                <p className="text-ink/50">This reading has no content yet.</p>
              )}
            </div>
          )}

          {item.type === "QUIZ" &&
            (quizData ? (
              <QuizPanel {...quizData} />
            ) : (
              <div className="rounded-card border-brutal border-ink bg-white py-12 text-center text-ink/50">
                This quiz hasn&apos;t been set up yet.
              </div>
            ))}

          {item.type === "ASSIGNMENT" &&
            (assignmentData ? (
              <div className="space-y-6">
                {assignmentData.instructions && (
                  <div className="rounded-card border-brutal border-ink bg-white p-6">
                    <Markdown content={assignmentData.instructions} />
                  </div>
                )}
                <AssignmentPanel {...assignmentData.panel} />
              </div>
            ) : (
              <div className="rounded-card border-brutal border-ink bg-white py-12 text-center text-ink/50">
                This assignment hasn&apos;t been set up yet.
              </div>
            ))}

          {/* Completion + prev/next */}
          <div className="mt-6 flex flex-col gap-4 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {item.type !== "QUIZ" && item.type !== "ASSIGNMENT" ? (
              <CompleteButton lessonItemId={item.id} initialCompleted={progress?.status === "COMPLETED"} />
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {prev ? (
                <Link
                  href={`/courses/${params.courseId}/lessons/${prev.id}`}
                  className="inline-flex items-center gap-1 rounded-full border-brutal border-ink bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/courses/${params.courseId}/lessons/${next.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-flame px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right column — course accordion */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <LessonSidebar courseId={params.courseId} modules={sidebar} openModuleId={item.moduleId} />
        </aside>
      </div>
    </AppShell>
  );
}
