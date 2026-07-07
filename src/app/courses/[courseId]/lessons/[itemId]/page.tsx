import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { isLive, liveWhere } from "@/lib/content/visibility";
import { isModuleLocked } from "@/lib/content/gating";
import { Lock } from "lucide-react";
import { videoProvider } from "@/lib/video";
import { storage } from "@/lib/storage";
import { AppHeader } from "@/components/app-header";
import { Markdown } from "@/components/markdown";
import { VideoPlayer } from "@/components/video-player";
import { PdfViewer } from "@/components/pdf-viewer";
import { CompleteButton } from "@/components/complete-button";
import { QuizPanel } from "@/components/quiz-panel";
import { AssignmentPanel, type SubmissionDTO } from "@/components/assignment-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE_META } from "@/components/lesson-type";

export const metadata = { title: "Lesson" };
export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: { courseId: string; itemId: string };
}) {
  const student = await requireStudent();

  const access = await prisma.studentCourseAccess.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId: params.courseId } },
  });
  if (!access) notFound();

  const item = await prisma.lessonItem.findFirst({
    where: { id: params.itemId, module: { courseId: params.courseId } },
    include: { module: true, video: true, document: true },
  });
  if (!item || !isLive(item) || !isLive(item.module)) notFound();

  // Sequential gating: block access to items inside a locked module.
  const lock = await isModuleLocked(student.id, params.courseId, item.moduleId);
  if (lock.locked) {
    return (
      <div className="min-h-screen">
        <AppHeader
          email={student.email}
          role="Student"
          nav={
            <Link href={`/courses/${params.courseId}`} className="hover:text-foreground">
              Course outline
            </Link>
          }
        />
        <main className="container max-w-3xl py-8">
          <Link
            href={`/courses/${params.courseId}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to outline
          </Link>
          <Card className="border-info/30 bg-info-soft/20">
            <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="flex h-20 w-16 animate-pop items-end justify-center rounded-arch bg-info-soft pb-3">
                <Lock className="h-7 w-7 text-info-strong" />
              </span>
              <p className="font-display text-lg font-semibold text-info-strong">
                This lecture is locked
              </p>
              <p className="max-w-sm text-sm text-info-strong/80">{lock.reason}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Flatten the course's live items for prev/next navigation.
  const modules = await prisma.module.findMany({
    where: { courseId: params.courseId, ...liveWhere() },
    orderBy: { orderIndex: "asc" },
    include: { items: { where: liveWhere(), orderBy: { orderIndex: "asc" }, select: { id: true, title: true } } },
  });
  const flat = modules.flatMap((m) => m.items);
  const idx = flat.findIndex((i) => i.id === item.id);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  const progress = await prisma.lessonProgress.findUnique({
    where: { studentId_lessonItemId: { studentId: student.id, lessonItemId: item.id } },
  });

  const { Icon, label } = LESSON_TYPE_META[item.type];
  const watermark = `${student.fullName ?? student.username} · ${student.email}`;

  // Signed, short-lived media URLs (server-side).
  const videoUrl =
    item.type === "VIDEO" && item.video ? await videoProvider.getStreamUrl(item.video) : null;
  const docUrl =
    item.type === "DOCUMENT" && item.document ? await storage.getUrl(item.document.storageKey) : null;

  // Assignment data. Grade/feedback are only exposed once releasedAt is set.
  let assignmentData: {
    panel: React.ComponentProps<typeof AssignmentPanel>;
    instructions: string | null;
  } | null = null;
  if (item.type === "ASSIGNMENT") {
    const assignment = await prisma.assignment.findUnique({
      where: { lessonItemId: item.id },
    });
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
        released: s.releasedAt
          ? { passed: s.passed, score: s.score, feedback: s.feedback }
          : null,
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

  // Quiz data (correct answers are NEVER sent to the client here).
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

  return (
    <div className="min-h-screen">
      <AppHeader
        email={student.email}
        role="Student"
        nav={
          <Link href={`/courses/${params.courseId}`} className="hover:text-foreground">
            Course outline
          </Link>
        }
      />
      <main className="container max-w-3xl py-8">
        <Link
          href={`/courses/${params.courseId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to outline
        </Link>

        <div className="mb-2.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-bark">
            <Icon className="h-3.5 w-3.5" /> {label}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {item.module.title}
          </span>
        </div>
        <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">{item.title}</h1>

        {/* ---- Content by type (one cohesive shell) ---- */}
        {item.type === "VIDEO" &&
          (videoUrl ? (
            <VideoPlayer
              src={videoUrl}
              watermark={watermark}
              lessonItemId={item.id}
              initialPosition={progress?.lastPositionSeconds ?? 0}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This video hasn&apos;t been uploaded yet.
              </CardContent>
            </Card>
          ))}

        {item.type === "DOCUMENT" &&
          (docUrl ? (
            <PdfViewer src={docUrl} watermark={watermark} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This document hasn&apos;t been uploaded yet.
              </CardContent>
            </Card>
          ))}

        {item.type === "RICH_TEXT" &&
          (item.body ? (
            <Markdown content={item.body} />
          ) : (
            <p className="text-muted-foreground">This reading has no content yet.</p>
          ))}

        {item.type === "QUIZ" &&
          (quizData ? (
            <QuizPanel {...quizData} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This quiz hasn&apos;t been set up yet.
              </CardContent>
            </Card>
          ))}

        {item.type === "ASSIGNMENT" &&
          (assignmentData ? (
            <div className="space-y-6">
              {assignmentData.instructions && (
                <Markdown content={assignmentData.instructions} />
              )}
              <AssignmentPanel {...assignmentData.panel} />
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This assignment hasn&apos;t been set up yet.
              </CardContent>
            </Card>
          ))}

        {/* ---- Footer: completion + prev/next ---- */}
        <div className="mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          {item.type !== "QUIZ" && item.type !== "ASSIGNMENT" ? (
            <CompleteButton
              lessonItemId={item.id}
              initialCompleted={progress?.status === "COMPLETED"}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {prev ? (
              <Link
                href={`/courses/${params.courseId}/lessons/${prev.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-bark/15 bg-background px-4 py-2 text-sm font-medium shadow-hairline transition-all duration-200 hover:border-bark/25 hover:bg-accent active:scale-[0.98]"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/courses/${params.courseId}/lessons/${next.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-lift transition-all duration-200 hover:bg-primary/90 hover:shadow-glow active:scale-[0.98]"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
