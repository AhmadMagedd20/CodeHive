import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { QuizQuestions, type QuestionDTO } from "./questions";
import { ensureQuiz, updateQuizSettings } from "./actions";

export const metadata = { title: "Quiz builder" };
export const dynamic = "force-dynamic";

function dtLocal(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function QuizBuilderPage({ params }: { params: { itemId: string } }) {
  const instructor = await requireInstructor();

  const item = await prisma.lessonItem.findFirst({
    where: { id: params.itemId, type: "QUIZ", module: { course: { instructorId: instructor.id } } },
    include: { module: { select: { courseId: true, title: true } } },
  });
  if (!item) notFound();

  await ensureQuiz(item.id); // create the quiz row on first visit
  const quiz = await prisma.quiz.findUnique({
    where: { lessonItemId: item.id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!quiz) notFound();

  const questions: QuestionDTO[] = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    explanation: q.explanation,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    correct: (q.correct as number | boolean | null) ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/admin/courses/${item.module.courseId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>
      <h1 className="mb-1 font-display text-subsection">{item.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Practice quiz · {item.module.title}. Results are for student tracking only — not a grade or a
        gate.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Quiz settings</CardTitle>
          <CardDescription>Window, time limit, and attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateQuizSettings} className="space-y-4">
            <input type="hidden" name="itemId" value={item.id} />
            <div className="space-y-1.5">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea id="instructions" name="instructions" defaultValue={quiz.instructions ?? ""} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="opensAt">Opens at (optional)</Label>
                <Input id="opensAt" name="opensAt" type="datetime-local" defaultValue={dtLocal(quiz.opensAt)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closesAt">Closes at (optional)</Label>
                <Input id="closesAt" name="closesAt" type="datetime-local" defaultValue={dtLocal(quiz.closesAt)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeLimitMinutes">Time limit (min, optional)</Label>
                <Input id="timeLimitMinutes" name="timeLimitMinutes" type="number" min={1} defaultValue={quiz.timeLimitMinutes ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxAttempts">Max attempts (blank = unlimited)</Label>
                <Input id="maxAttempts" name="maxAttempts" type="number" min={1} defaultValue={quiz.maxAttempts ?? ""} />
              </div>
            </div>
            <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-3 font-display text-card-title">
        Questions <span className="text-muted-foreground">({questions.length})</span>
      </h2>
      <QuizQuestions itemId={item.id} questions={questions} />
    </div>
  );
}
