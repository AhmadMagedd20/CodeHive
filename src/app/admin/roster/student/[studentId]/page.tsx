import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Lock, Unlock, CalendarCheck, ChevronRight } from "lucide-react";
import type { CourseAccessMode } from "@prisma/client";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StateBadge } from "@/components/state-badge";
import { SubmitButton } from "@/components/submit-button";
import {
  setAccessModeAction,
  grantWithModeAction,
  releaseModuleAction,
  unreleaseModuleAction,
  releaseNextModuleAction,
} from "../../actions";

export const metadata = { title: "Student — Roster" };
export const dynamic = "force-dynamic";

const MODES: { value: CourseAccessMode; label: string; hint: string }[] = [
  { value: "FULL", label: "Full course", hint: "Everything open at once" },
  { value: "DRIP", label: "Manual drip", hint: "You release lectures one by one" },
  { value: "GATED", label: "Assignment-gated", hint: "Pass to unlock the next" },
];

export default async function RosterStudentPage({ params }: { params: { studentId: string } }) {
  const instructor = await requireInstructor();

  const student = await prisma.student.findFirst({
    where: { id: params.studentId, instructorId: instructor.id },
    include: {
      courseAccess: {
        include: {
          course: {
            include: {
              modules: { orderBy: { orderIndex: "asc" }, select: { id: true, title: true } },
            },
          },
        },
        orderBy: { grantedAt: "desc" },
      },
      moduleReleases: { select: { moduleId: true } },
      attendance: { select: { courseId: true, status: true } },
      rosterEntry: { select: { name: true, notes: true } },
    },
  });
  if (!student) notFound();

  const allCourses = await prisma.course.findMany({
    where: { instructorId: instructor.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  const accessedIds = new Set(student.courseAccess.map((a) => a.courseId));
  const grantable = allCourses.filter((c) => !accessedIds.has(c.id));
  const releasedSet = new Set(student.moduleReleases.map((r) => r.moduleId));

  const attendanceByCourse = new Map<string, { attended: number; total: number }>();
  for (const a of student.attendance) {
    const cur = attendanceByCourse.get(a.courseId) ?? { attended: 0, total: 0 };
    cur.total += 1;
    if (a.status === "ATTENDED") cur.attended += 1;
    attendanceByCourse.set(a.courseId, cur);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/roster"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to roster
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-subsection">{student.username}</h1>
        {student.isInPerson && <Badge variant="success">In-person</Badge>}
        <StateBadge state={student.state} />
      </div>
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        {student.rosterEntry?.name && `Roster: ${student.rosterEntry.name} · `}
        {student.email}
        {student.rosterEntry?.notes ? ` · ${student.rosterEntry.notes}` : ""}
      </p>

      {/* Grant a new course */}
      {grantable.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Grant course access</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={grantWithModeAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="studentId" value={student.id} />
              <div className="min-w-[12rem] flex-1 space-y-1.5">
                <label className="text-sm font-medium">Course</label>
                <Select name="courseId" defaultValue="" required>
                  <option value="" disabled>
                    Select a course
                  </option>
                  {grantable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Access mode</label>
                <Select name="mode" defaultValue="DRIP">
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton pendingText="Granting…">Grant</SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      {student.courseAccess.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No course access yet. Grant one above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {student.courseAccess.map((a) => {
            const att = attendanceByCourse.get(a.courseId);
            const rate = att && att.total > 0 ? Math.round((att.attended / att.total) * 100) : null;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{a.course.title}</CardTitle>
                    <Link
                      href={`/admin/attendance?course=${a.courseId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-flame underline-offset-4 hover:underline"
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Attendance{rate != null ? ` · ${rate}%` : ""}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Access mode selector */}
                  <div>
                    <p className="mb-2 text-eyebrow uppercase text-muted-foreground">
                      Access mode
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MODES.map((m) => {
                        const on = a.accessMode === m.value;
                        return (
                          <form key={m.value} action={setAccessModeAction}>
                            <input type="hidden" name="studentId" value={student.id} />
                            <input type="hidden" name="courseId" value={a.courseId} />
                            <input type="hidden" name="mode" value={m.value} />
                            <button
                              type="submit"
                              title={m.hint}
                              className={cn(
                                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                                on
                                  ? "border-flame bg-flame text-white shadow-lift"
                                  : "border-ink/15 text-ink hover:bg-accent/50",
                              )}
                            >
                              {m.label}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </div>

                  {/* Drip release controls (only meaningful in DRIP mode) */}
                  {a.accessMode === "DRIP" && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-eyebrow uppercase text-muted-foreground">
                          Lecture release ({a.course.modules.filter((m) => releasedSet.has(m.id)).length}/
                          {a.course.modules.length})
                        </p>
                        <form action={releaseNextModuleAction}>
                          <input type="hidden" name="studentId" value={student.id} />
                          <input type="hidden" name="courseId" value={a.courseId} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-strong hover:bg-success/20"
                          >
                            <Unlock className="h-3.5 w-3.5" /> Release next
                          </button>
                        </form>
                      </div>
                      {a.course.modules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No lectures in this course yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {a.course.modules.map((m, mi) => {
                            const released = releasedSet.has(m.id);
                            return (
                              <li
                                key={m.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                                  released
                                    ? "border-success/30 bg-success-soft/30"
                                    : "border-dashed border-info/40 bg-info-soft/20",
                                )}
                              >
                                <span className="text-xs font-semibold text-muted-foreground">
                                  W{mi + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {m.title}
                                </span>
                                {released ? (
                                  <form action={unreleaseModuleAction}>
                                    <input type="hidden" name="studentId" value={student.id} />
                                    <input type="hidden" name="moduleId" value={m.id} />
                                    <button
                                      type="submit"
                                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-success-strong hover:bg-danger-soft hover:text-danger-strong"
                                    >
                                      <Check className="h-3.5 w-3.5" /> Released
                                    </button>
                                  </form>
                                ) : (
                                  <form action={releaseModuleAction}>
                                    <input type="hidden" name="studentId" value={student.id} />
                                    <input type="hidden" name="moduleId" value={m.id} />
                                    <button
                                      type="submit"
                                      className="inline-flex items-center gap-1.5 rounded-full border-brutal border-ink px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-flame/40 hover:text-foreground"
                                    >
                                      <Lock className="h-3.5 w-3.5" /> Release
                                    </button>
                                  </form>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
