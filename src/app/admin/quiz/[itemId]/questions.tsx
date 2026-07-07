"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, X, Check } from "lucide-react";
import type { QuizQuestionType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { addQuestion, updateQuestion, deleteQuestion, moveQuestion } from "./actions";

export type QuestionDTO = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  explanation: string | null;
  options: string[] | null;
  correct: number | boolean | null;
};

const TYPE_LABEL: Record<QuizQuestionType, string> = {
  MCQ: "Multiple choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

function IconForm({
  action,
  fields,
  title,
  confirm,
  children,
  disabled,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  title: string;
  confirm?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <form action={action} onSubmit={(e) => confirm && !window.confirm(confirm) && e.preventDefault()}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        title={title}
        aria-label={title}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
      >
        {children}
      </button>
    </form>
  );
}

/** Add/edit form for a single question, with dynamic MCQ options. */
function QuestionEditor({
  itemId,
  question,
  onDone,
}: {
  itemId: string;
  question?: QuestionDTO;
  onDone?: () => void;
}) {
  const [type, setType] = useState<QuizQuestionType>(question?.type ?? "MCQ");
  const [options, setOptions] = useState<string[]>(
    question?.options && question.options.length ? question.options : ["", ""],
  );
  const [correctIndex, setCorrectIndex] = useState<number>(
    typeof question?.correct === "number" ? question.correct : 0,
  );
  const isEdit = !!question;

  return (
    <form
      action={isEdit ? updateQuestion : addQuestion}
      className="space-y-3 rounded-lg border bg-muted/20 p-4"
    >
      {isEdit ? (
        <input type="hidden" name="questionId" value={question.id} />
      ) : (
        <input type="hidden" name="itemId" value={itemId} />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as QuizQuestionType)}
            className="w-44"
          >
            <option value="MCQ">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short answer</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Points</Label>
          <Input name="points" type="number" min={1} defaultValue={question?.points ?? 1} className="w-24" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Question</Label>
        <Textarea name="prompt" defaultValue={question?.prompt ?? ""} rows={2} required />
      </div>

      {type === "MCQ" && (
        <div className="space-y-2">
          <Label className="text-xs">Options (select the correct one)</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctIndex"
                value={i}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="h-4 w-4 accent-[color:hsl(var(--primary))]"
              />
              <Input
                name="option"
                value={opt}
                onChange={(e) => setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={`Option ${i + 1}`}
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setOptions((o) => o.filter((_, j) => j !== i));
                    if (correctIndex >= i && correctIndex > 0) setCorrectIndex((c) => c - 1);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => setOptions((o) => [...o, ""])}>
            <Plus className="h-4 w-4" /> Add option
          </Button>
        </div>
      )}

      {type === "TRUE_FALSE" && (
        <div className="space-y-1">
          <Label className="text-xs">Correct answer</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="correctBool"
                value="true"
                defaultChecked={question?.correct !== false}
                className="h-4 w-4 accent-[color:hsl(var(--primary))]"
              />
              True
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="correctBool"
                value="false"
                defaultChecked={question?.correct === false}
                className="h-4 w-4 accent-[color:hsl(var(--primary))]"
              />
              False
            </label>
          </div>
        </div>
      )}

      {type === "SHORT_ANSWER" && (
        <p className="text-xs text-muted-foreground">
          Short-answer responses are graded manually in the grading queue.
        </p>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Explanation (optional, shown after submit)</Label>
        <Input name="explanation" defaultValue={question?.explanation ?? ""} />
      </div>

      <div className="flex gap-2">
        <SubmitButton size="sm" pendingText="Saving…">
          {isEdit ? "Save question" : "Add question"}
        </SubmitButton>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function QuestionCard({ q, index, total }: { q: QuestionDTO; index: number; total: number }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <QuestionEditor itemId="" question={q} onDone={() => setEditing(false)} />;

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-start gap-2">
          <span className="text-sm font-semibold text-muted-foreground">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{q.prompt}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[q.type]}</Badge>
              <Badge variant="outline">
                {q.points} pt{q.points === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center">
            <IconForm action={moveQuestion} fields={{ questionId: q.id, dir: "up" }} title="Move up" disabled={index === 0}>
              <ChevronUp className="h-4 w-4" />
            </IconForm>
            <IconForm action={moveQuestion} fields={{ questionId: q.id, dir: "down" }} title="Move down" disabled={index === total - 1}>
              <ChevronDown className="h-4 w-4" />
            </IconForm>
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Edit"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <IconForm action={deleteQuestion} fields={{ questionId: q.id }} title="Delete" confirm="Delete this question?">
              <Trash2 className="h-4 w-4 text-destructive" />
            </IconForm>
          </div>
        </div>

        {q.type === "MCQ" && q.options && (
          <ul className="ml-6 space-y-1 text-sm">
            {q.options.map((o, i) => (
              <li key={i} className={i === q.correct ? "flex items-center gap-1.5 font-medium text-success-strong" : "text-muted-foreground"}>
                {i === q.correct && <Check className="h-3.5 w-3.5" />} {o}
              </li>
            ))}
          </ul>
        )}
        {q.type === "TRUE_FALSE" && (
          <p className="ml-6 text-sm text-muted-foreground">
            Correct: <span className="font-medium text-success-strong">{q.correct === false ? "False" : "True"}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function QuizQuestions({ itemId, questions }: { itemId: string; questions: QuestionDTO[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <QuestionCard key={q.id} q={q} index={i} total={questions.length} />
      ))}
      {adding ? (
        <QuestionEditor itemId={itemId} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      )}
    </div>
  );
}
