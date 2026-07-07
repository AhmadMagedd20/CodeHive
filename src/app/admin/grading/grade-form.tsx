"use client";

import { useState } from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { CodeEditor } from "@/components/code-editor";
import { isCodeLanguage } from "@/components/code-editor-langs";
import { gradeSubmission, createSnippet, deleteSnippet } from "./actions";

export type SnippetDTO = { id: string; title: string; body: string };

/**
 * Per-submission grading form. Snippets insert into the feedback box and stay
 * editable, so common feedback isn't retyped but every submission still gets
 * individual wording. Saving releases the grade to the student.
 */
export function GradeForm({
  submissionId,
  code,
  codeLanguage,
  fileUrl,
  filename,
  snippets,
}: {
  submissionId: string;
  code: string | null;
  codeLanguage: string | null;
  fileUrl: string | null;
  filename: string | null;
  snippets: SnippetDTO[];
}) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className="space-y-4">
      {code != null && (
        <CodeEditor
          value={code}
          language={codeLanguage && isCodeLanguage(codeLanguage) ? codeLanguage : "plain"}
          readOnly
          minHeight="140px"
        />
      )}
      {fileUrl && (
        <a
          href={fileUrl}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          <Download className="h-4 w-4" /> {filename ?? "Download submission"}
        </a>
      )}

      <form action={gradeSubmission} className="space-y-3">
        <input type="hidden" name="submissionId" value={submissionId} />

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Label className="text-xs uppercase text-muted-foreground">Result</Label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="passed" value="pass" defaultChecked className="h-4 w-4 accent-[color:hsl(var(--primary))]" />
            Pass
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="passed" value="fail" className="h-4 w-4 accent-[color:hsl(var(--primary))]" />
            Not passed (student can resubmit)
          </label>
          <div className="flex items-center gap-2">
            <Label htmlFor={`score-${submissionId}`} className="text-xs uppercase text-muted-foreground">
              Score (optional)
            </Label>
            <Input id={`score-${submissionId}`} name="score" type="number" min={0} className="h-8 w-24" />
          </div>
        </div>

        {snippets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {snippets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFeedback((f) => (f ? `${f}\n${s.body}` : s.body))}
                className="rounded-full border bg-secondary px-2.5 py-1 text-xs hover:bg-accent"
                title={s.body}
              >
                + {s.title}
              </button>
            ))}
          </div>
        )}

        <Textarea
          name="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder="Feedback for the student (insert a snippet above, then edit)…"
        />

        <SubmitButton size="sm" pendingText="Releasing…">
          Save grade & release to student
        </SubmitButton>
      </form>
    </div>
  );
}

/** Manage reusable feedback snippets. */
export function SnippetManager({ snippets }: { snippets: SnippetDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Feedback snippets ({snippets.length})</p>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Manage"}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          {snippets.map((s) => (
            <div key={s.id} className="flex items-start gap-2 rounded-lg border bg-background p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="truncate text-xs text-muted-foreground">{s.body}</p>
              </div>
              <form action={deleteSnippet}>
                <input type="hidden" name="snippetId" value={s.id} />
                <button type="submit" aria-label="Delete snippet" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))}
          <form action={createSnippet} className="space-y-2 rounded-lg border border-dashed p-3">
            <Input name="title" placeholder="Snippet title (e.g. 'Missing edge cases')" required />
            <Textarea name="body" placeholder="Snippet text…" rows={2} required />
            <SubmitButton size="sm" pendingText="Adding…">
              <Plus className="h-4 w-4" /> Add snippet
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
