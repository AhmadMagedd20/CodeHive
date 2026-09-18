import { CheckCircle2 } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { gradeShortAnswer } from "./actions";
import { GradeForm, SnippetManager, type SnippetDTO } from "./grade-form";

export const metadata = { title: "Grading — Admin" };
export const dynamic = "force-dynamic";

export default async function GradingPage({
  searchParams,
}: {
  searchParams: { courseId?: string; assignmentId?: string };
}) {
  const instructor = await requireInstructor();
  const courseFilter = searchParams.courseId || undefined;
  const assignmentFilter = searchParams.assignmentId || undefined;

  const [courses, snippets, submissions, pendingAnswers] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: instructor.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.feedbackSnippet.findMany({
      where: { instructorId: instructor.id },
      orderBy: { title: "asc" },
    }),
    prisma.submission.findMany({
      where: {
        status: "SUBMITTED",
        assignment: {
          ...(assignmentFilter ? { id: assignmentFilter } : {}),
          lessonItem: {
            module: {
              course: { instructorId: instructor.id, ...(courseFilter ? { id: courseFilter } : {}) },
            },
          },
        },
      },
      include: {
        student: { select: { username: true, email: true } },
        fileAsset: true,
        assignment: {
          include: {
            lessonItem: {
              select: {
                title: true,
                module: { select: { course: { select: { id: true, title: true } } } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.quizAnswer.findMany({
      where: {
        needsManualGrade: true,
        awardedPoints: null,
        attempt: { quiz: { lessonItem: { module: { course: { instructorId: instructor.id } } } } },
      },
      include: {
        question: { select: { prompt: true, points: true } },
        attempt: {
          select: {
            submittedAt: true,
            student: { select: { username: true, email: true } },
            quiz: { select: { lessonItem: { select: { title: true } } } },
          },
        },
      },
      orderBy: { attempt: { submittedAt: "asc" } },
    }),
  ]);

  // Assignments (for the filter dropdown) within the selected course scope.
  const assignments = await prisma.assignment.findMany({
    where: {
      lessonItem: {
        module: {
          course: { instructorId: instructor.id, ...(courseFilter ? { id: courseFilter } : {}) },
        },
      },
    },
    select: { id: true, lessonItem: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });

  const snippetDtos: SnippetDTO[] = snippets.map((s) => ({ id: s.id, title: s.title, body: s.body }));

  // Pre-sign download URLs for file submissions (server-side).
  const fileUrls = new Map<string, string>();
  for (const s of submissions) {
    if (s.fileAsset) {
      fileUrls.set(s.id, await storage.getUrl(s.fileAsset.storageKey, { download: true }));
    }
  }

  const total = submissions.length + pendingAnswers.length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="font-display text-subsection">Grading queue</h1>
          <Badge variant={total ? "warning" : "secondary"}>{total}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything awaiting grading across your courses — assignment submissions and short-answer
          quiz responses.
        </p>
      </div>

      <SnippetManager snippets={snippetDtos} />

      {/* ---- Assignment submissions ---- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-card-title">
            Submissions <span className="text-muted-foreground">({submissions.length})</span>
          </h2>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <Select name="courseId" defaultValue={courseFilter ?? ""} className="h-9 w-44 text-sm">
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Select name="assignmentId" defaultValue={assignmentFilter ?? ""} className="h-9 w-48 text-sm">
              <option value="">All assignments</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.lessonItem.title}
                </option>
              ))}
            </Select>
            <SubmitButton size="sm" variant="outline" pendingText="…">
              Filter
            </SubmitButton>
          </form>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft">
                <CheckCircle2 className="h-5 w-5 text-success-strong" />
              </span>
              <p className="text-sm text-muted-foreground">No submissions awaiting grading.</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {s.assignment.lessonItem.title}
                  <Badge variant="outline">{s.assignment.lessonItem.module.course.title}</Badge>
                  {s.isLate && <Badge variant="destructive">Late</Badge>}
                  {s.assignment.isGating && <Badge variant="warning">Gating</Badge>}
                </CardTitle>
                <CardDescription>
                  {s.student.username} ({s.student.email}) · attempt {s.attemptNo} ·{" "}
                  {s.submittedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradeForm
                  submissionId={s.id}
                  code={s.codeContent}
                  codeLanguage={s.codeLanguage}
                  fileUrl={fileUrls.get(s.id) ?? null}
                  filename={s.fileAsset?.filename ?? null}
                  snippets={snippetDtos}
                />
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* ---- Short-answer quiz responses ---- */}
      <section className="space-y-4">
        <h2 className="font-display text-card-title">
          Quiz short answers <span className="text-muted-foreground">({pendingAnswers.length})</span>
        </h2>
        {pendingAnswers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft">
                <CheckCircle2 className="h-5 w-5 text-success-strong" />
              </span>
              <p className="text-sm text-muted-foreground">No quiz answers awaiting grading.</p>
            </CardContent>
          </Card>
        ) : (
          pendingAnswers.map((a) => {
            const response = typeof a.response === "string" ? a.response : JSON.stringify(a.response);
            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-base">{a.question.prompt}</CardTitle>
                  <CardDescription>
                    {a.attempt.quiz.lessonItem.title} · {a.attempt.student.username} ({a.attempt.student.email})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    {response || <span className="text-muted-foreground">(no answer)</span>}
                  </div>
                  <form action={gradeShortAnswer} className="flex items-end gap-2">
                    <input type="hidden" name="answerId" value={a.id} />
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Points (max {a.question.points})</label>
                      <Input
                        name="awardedPoints"
                        type="number"
                        min={0}
                        max={a.question.points}
                        defaultValue={a.question.points}
                        className="w-28"
                      />
                    </div>
                    <SubmitButton size="sm" pendingText="Saving…">
                      Save grade
                    </SubmitButton>
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
