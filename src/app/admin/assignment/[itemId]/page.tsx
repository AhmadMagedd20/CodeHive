import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth/current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { CODE_LANGUAGES } from "@/components/code-editor-langs";
import { updateAssignmentSettings } from "./actions";

export const metadata = { title: "Assignment builder" };
export const dynamic = "force-dynamic";

function dtLocal(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function AssignmentBuilderPage({ params }: { params: { itemId: string } }) {
  const instructor = await requireInstructor();

  const item = await prisma.lessonItem.findFirst({
    where: {
      id: params.itemId,
      type: "ASSIGNMENT",
      module: { course: { instructorId: instructor.id } },
    },
    include: {
      module: { select: { courseId: true, title: true } },
      assignment: { include: { _count: { select: { submissions: true } } } },
    },
  });
  if (!item) notFound();
  const a = item.assignment;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/admin/courses/${item.module.courseId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold">{item.title}</h1>
        {a?.isGating && <Badge variant="warning">Gating</Badge>}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Assignment · {item.module.title}
        {a ? ` · ${a._count.submissions} submission${a._count.submissions === 1 ? "" : "s"}` : ""}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment settings</CardTitle>
          <CardDescription>
            Instructions, due date, gating, and how students submit their work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAssignmentSettings} className="space-y-4">
            <input type="hidden" name="itemId" value={item.id} />
            <div className="space-y-1.5">
              <Label htmlFor="instructions">Instructions (Markdown supported)</Label>
              <Textarea
                id="instructions"
                name="instructions"
                defaultValue={a?.instructions ?? ""}
                rows={6}
                placeholder={"Describe the task. Fenced ``` code blocks are supported."}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dueAt">Due date (optional)</Label>
                <Input id="dueAt" name="dueAt" type="datetime-local" defaultValue={dtLocal(a?.dueAt ?? null)} />
                <p className="text-xs text-muted-foreground">
                  Late submissions are accepted but flagged.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="submissionMode">Submission mode</Label>
                <Select id="submissionMode" name="submissionMode" defaultValue={a?.submissionMode ?? "FILE"}>
                  <option value="FILE">File upload (PDF / image / zip)</option>
                  <option value="CODE">Code editor (paste code in-app)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codeLanguage">Default code language (CODE mode)</Label>
                <Select id="codeLanguage" name="codeLanguage" defaultValue={a?.codeLanguage ?? "java"}>
                  {CODE_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
              <Checkbox id="isGating" name="isGating" defaultChecked={a?.isGating ?? false} className="mt-0.5" />
              <Label htmlFor="isGating" className="text-sm font-normal leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">Gating assignment</span> — students
                must pass this assignment to unlock the next lecture (when the course has gating
                enabled). Failed students can resubmit without your intervention.
              </Label>
            </div>

            <SubmitButton pendingText="Saving…">Save assignment</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
