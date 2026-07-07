"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Loader2, Upload, FileText } from "lucide-react";
import type { SubmissionMode } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/code-editor";
import { type CodeLanguageId, isCodeLanguage } from "@/components/code-editor-langs";

export type SubmissionDTO = {
  id: string;
  attemptNo: number;
  submittedAt: string;
  isLate: boolean;
  /** null until the grade is released to the student */
  released: null | {
    passed: boolean | null;
    score: number | null;
    feedback: string | null;
  };
  filename: string | null;
};

export function AssignmentPanel({
  assignmentId,
  mode,
  defaultLanguage,
  dueAt,
  isGating,
  submissions,
}: {
  assignmentId: string;
  mode: SubmissionMode;
  defaultLanguage: string | null;
  dueAt: string | null;
  isGating: boolean;
  submissions: SubmissionDTO[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<CodeLanguageId>(
    defaultLanguage && isCodeLanguage(defaultLanguage) ? defaultLanguage : "java",
  );
  const [fileName, setFileName] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const due = dueAt ? new Date(dueAt) : null;
  const isPastDue = !!due && Date.now() > due.getTime();
  const latest = submissions[0] ?? null;
  const hasPassed = submissions.some((s) => s.released?.passed === true);

  async function submit() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const fd = new FormData();
      fd.set("assignmentId", assignmentId);
      if (mode === "CODE") {
        fd.set("code", code);
        fd.set("language", language);
      } else {
        const f = fileRef.current?.files?.[0];
        if (!f) throw new Error("Choose a file first.");
        fd.set("file", f);
      }
      const res = await fetch("/api/assignment/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setNotice(
        `Submitted (attempt ${data.attemptNo})${data.isLate ? " — flagged late" : ""}. You'll see your grade here once it's released.`,
      );
      setCode("");
      setFileName(undefined);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {due && (
          <Badge variant={isPastDue ? "destructive" : "secondary"}>
            <Clock className="mr-1 h-3 w-3" />
            Due {due.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            {isPastDue ? " (past due — late submissions flagged)" : ""}
          </Badge>
        )}
        {isGating && <Badge variant="warning">Pass to unlock the next lecture</Badge>}
        {hasPassed && (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Passed
          </Badge>
        )}
      </div>

      {/* Past submissions */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">Attempt {s.attemptNo}</span>
                  <span className="text-muted-foreground">
                    {new Date(s.submittedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {s.isLate && <Badge variant="destructive">Late</Badge>}
                  {s.filename && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> {s.filename}
                    </span>
                  )}
                  <span className="ml-auto">
                    {s.released ? (
                      s.released.passed === true ? (
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Passed
                        </Badge>
                      ) : s.released.passed === false ? (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" /> Not passed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Graded</Badge>
                      )
                    ) : (
                      <Badge variant="secondary">Awaiting grading</Badge>
                    )}
                  </span>
                </div>
                {s.released?.score != null && (
                  <p className="mt-1.5 text-sm text-muted-foreground">Score: {s.released.score}</p>
                )}
                {s.released?.feedback && (
                  <div className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                    {s.released.feedback}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit / resubmit */}
      {!hasPassed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {latest ? "Resubmit" : "Submit your work"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mode === "CODE" ? (
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                onLanguageChange={setLanguage}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/*,.zip,application/zip"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name)}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Choose file
                </Button>
                <span className="text-sm text-muted-foreground">
                  {fileName ?? "PDF, image, or zip · max 25 MB"}
                </span>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-success-strong">{notice}</p>}

            <Button onClick={submit} disabled={busy || (mode === "CODE" ? !code.trim() : false)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {latest ? `Submit attempt ${latest.attemptNo + 1}` : "Submit"}
            </Button>
            {latest && !latest.released && (
              <p className="text-xs text-muted-foreground">
                Your previous attempt is still being graded — you can still resubmit; the newest
                attempt is what gets graded next.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
