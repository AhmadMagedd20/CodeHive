"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import type { QuizQuestionType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type QuizQuestionPublic = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  options: string[] | null;
};
export type PastAttempt = {
  attemptNo: number;
  status: string;
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
};
type Result = {
  score: number;
  maxScore: number;
  needsManual: boolean;
  results: { questionId: string; correct: number | boolean | null; explanation: string | null; isCorrect: boolean | null }[];
};

export function QuizPanel({
  quizId,
  instructions,
  questions,
  attemptsUsed,
  maxAttempts,
  isOpen,
  isClosed,
  timeLimitMinutes,
  pastAttempts,
}: {
  quizId: string;
  instructions: string | null;
  questions: QuizQuestionPublic[];
  attemptsUsed: number;
  maxAttempts: number | null;
  isOpen: boolean;
  isClosed: boolean;
  timeLimitMinutes: number | null;
  pastAttempts: PastAttempt[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "taking" | "done">("idle");
  const [attemptId, setAttemptId] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, number | boolean | string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [remaining, setRemaining] = useState<number | null>(null);

  const canStart =
    isOpen && !isClosed && (maxAttempts == null || attemptsUsed < maxAttempts) && questions.length > 0;

  async function start() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start quiz");
      setAttemptId(data.attemptId);
      setAnswers({});
      setMode("taking");
      if (timeLimitMinutes) setRemaining(timeLimitMinutes * 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start quiz");
    } finally {
      setBusy(false);
    }
  }

  const submit = useCallback(async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(undefined);
    try {
      const payload = questions.map((q) => ({ questionId: q.id, response: answers[q.id] ?? null }));
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't submit");
      setResult(data);
      setMode("done");
      setRemaining(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setBusy(false);
    }
  }, [attemptId, answers, questions, router]);

  // Countdown timer → auto-submit at zero.
  useEffect(() => {
    if (mode !== "taking" || remaining == null) return;
    if (remaining <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [mode, remaining, submit]);

  const totalPoints = questions.reduce((n, q) => n + q.points, 0);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;

  // ---- IDLE ----
  if (mode === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Practice quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructions && <p className="text-sm text-muted-foreground">{instructions}</p>}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{questions.length} questions</Badge>
            <Badge variant="secondary">{totalPoints} points</Badge>
            <Badge variant="secondary">
              Attempts: {attemptsUsed}
              {maxAttempts != null ? ` / ${maxAttempts}` : " (unlimited)"}
            </Badge>
            {timeLimitMinutes && <Badge variant="secondary">{timeLimitMinutes} min limit</Badge>}
          </div>

          {pastAttempts.length > 0 && (
            <div className="rounded-lg border">
              <p className="border-b px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                Your attempts
              </p>
              <ul className="divide-y text-sm">
                {pastAttempts.map((a) => (
                  <li key={a.attemptNo} className="flex items-center justify-between px-3 py-2">
                    <span>Attempt {a.attemptNo}</span>
                    <span className="text-muted-foreground">
                      {a.status === "SUBMITTED"
                        ? "Awaiting grading"
                        : a.score != null
                          ? `${a.score} / ${a.maxScore}`
                          : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {!isOpen && <p className="text-sm text-warning-strong">This quiz isn&apos;t open yet.</p>}
          {isClosed && <p className="text-sm text-warning-strong">This quiz has closed.</p>}
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions have been added yet.</p>
          )}

          <Button onClick={start} disabled={!canStart || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {attemptsUsed > 0 ? "Retake quiz" : "Start quiz"}
          </Button>
          {maxAttempts != null && attemptsUsed >= maxAttempts && (
            <p className="text-sm text-muted-foreground">No attempts remaining.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- TAKING ----
  if (mode === "taking") {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">
            {answeredCount} / {questions.length} answered
          </CardTitle>
          {remaining != null && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">
                <span className="text-muted-foreground">{i + 1}.</span> {q.prompt}{" "}
                <span className="text-xs text-muted-foreground">
                  ({q.points} pt{q.points === 1 ? "" : "s"})
                </span>
              </p>
              {q.type === "MCQ" && q.options && (
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => (
                    <label key={oi} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/40">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === oi}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className="h-4 w-4 accent-[color:hsl(var(--primary))]"
                      />
                      {o}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "TRUE_FALSE" && (
                <div className="flex gap-3 text-sm">
                  {[true, false].map((val) => (
                    <label key={String(val)} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent/40">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === val}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                        className="h-4 w-4 accent-[color:hsl(var(--primary))]"
                      />
                      {val ? "True" : "False"}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "SHORT_ANSWER" && (
                <Textarea
                  rows={3}
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- DONE ----
  const r = result!;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {r.needsManual ? "Submitted — awaiting grading" : "Your result"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-2xl font-semibold">
            {r.score} <span className="text-base font-normal text-muted-foreground">/ {r.maxScore} auto-graded points</span>
          </p>
          {r.needsManual && (
            <p className="mt-1 text-sm text-muted-foreground">
              Short-answer questions will be graded by Megz — check back for your full result.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const res = r.results.find((x) => x.questionId === q.id);
            return (
              <div key={q.id} className="rounded-lg border p-3">
                <p className="font-medium">
                  <span className="text-muted-foreground">{i + 1}.</span> {q.prompt}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                  {res?.isCorrect === true && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {res?.isCorrect === false && <XCircle className="h-4 w-4 text-destructive" />}
                  {res?.isCorrect == null && <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-muted-foreground">
                    {res?.isCorrect === true
                      ? "Correct"
                      : res?.isCorrect === false
                        ? q.type === "MCQ" && q.options
                          ? `Correct answer: ${q.options[res.correct as number]}`
                          : `Correct answer: ${res.correct ? "True" : "False"}`
                        : "Awaiting manual grading"}
                  </span>
                </div>
                {res?.explanation && (
                  <p className="mt-1 text-sm text-muted-foreground">{res.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        <Button variant="outline" onClick={() => setMode("idle")}>
          Done
        </Button>
      </CardContent>
    </Card>
  );
}
