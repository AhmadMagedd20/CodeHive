import { X } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StateBadge } from "@/components/state-badge";
import { SubmitButton } from "@/components/submit-button";
import {
  grantCourseAccessAction,
  revokeCourseAccessAction,
  suspendStudentAction,
  reactivateStudentAction,
  grantModuleUnlockAction,
  revokeModuleUnlockAction,
} from "../actions";

export const metadata = { title: "Students — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const instructor = await requireInstructor();

  const [students, courses, modules] = await Promise.all([
    prisma.student.findMany({
      where: { instructorId: instructor.id },
      include: {
        courseAccess: { include: { course: true } },
        moduleUnlocks: {
          include: { module: { select: { title: true, course: { select: { title: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({ where: { instructorId: instructor.id }, orderBy: { title: "asc" } }),
    prisma.module.findMany({
      where: { course: { instructorId: instructor.id }, prerequisiteModuleId: { not: null } },
      select: { id: true, title: true, courseId: true, course: { select: { title: true } } },
      orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-subsection">Students</h1>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students have registered yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {students.map((s) => {
            const grantedIds = new Set(s.courseAccess.map((a) => a.courseId));
            const available = courses.filter((c) => !grantedIds.has(c.id));
            return (
              <Card key={s.id}>
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-lg">{s.username}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {s.email} · {s.university}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StateBadge state={s.state} />
                    {s.state === "ACTIVE" && (
                      <form action={suspendStudentAction}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <SubmitButton size="sm" variant="outline" pendingText="…">
                          Suspend
                        </SubmitButton>
                      </form>
                    )}
                    {["SUSPENDED", "DEACTIVATED", "REJECTED"].includes(s.state) && (
                      <form action={reactivateStudentAction}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <SubmitButton size="sm" variant="outline" pendingText="…">
                          Reactivate
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-eyebrow uppercase text-muted-foreground">
                      Course access
                    </p>
                    {s.courseAccess.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No courses granted.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {s.courseAccess.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs"
                          >
                            {a.course.title}
                            <form action={revokeCourseAccessAction} className="inline">
                              <input type="hidden" name="studentId" value={s.id} />
                              <input type="hidden" name="courseId" value={a.courseId} />
                              <button
                                type="submit"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Remove ${a.course.title}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </form>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {available.length > 0 && (
                    <form action={grantCourseAccessAction} className="flex items-end gap-2">
                      <input type="hidden" name="studentId" value={s.id} />
                      <div className="w-64 max-w-full">
                        <Select name="courseId" defaultValue="" required>
                          <option value="" disabled>
                            Grant a course…
                          </option>
                          {available.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <SubmitButton size="sm" pendingText="…">
                        Grant
                      </SubmitButton>
                    </form>
                  )}

                  {/* Manual gating overrides — unlock a gated module for THIS student */}
                  {(() => {
                    const accessibleModules = modules.filter((m) => grantedIds.has(m.courseId));
                    if (accessibleModules.length === 0 && s.moduleUnlocks.length === 0) return null;
                    return (
                      <div className="border-t pt-3">
                        <p className="mb-1.5 text-eyebrow uppercase text-muted-foreground">
                          Manual unlocks (gating override)
                        </p>
                        {s.moduleUnlocks.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {s.moduleUnlocks.map((u) => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs"
                              >
                                {u.module.course.title}: {u.module.title}
                                <form action={revokeModuleUnlockAction} className="inline">
                                  <input type="hidden" name="unlockId" value={u.id} />
                                  <button
                                    type="submit"
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label="Revoke unlock"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </form>
                              </span>
                            ))}
                          </div>
                        )}
                        {accessibleModules.length > 0 && (
                          <form action={grantModuleUnlockAction} className="flex items-end gap-2">
                            <input type="hidden" name="studentId" value={s.id} />
                            <div className="w-72 max-w-full">
                              <Select name="moduleId" defaultValue="" required>
                                <option value="" disabled>
                                  Unlock a gated module…
                                </option>
                                {accessibleModules.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.course.title}: {m.title}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <SubmitButton size="sm" variant="outline" pendingText="…">
                              Unlock
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {courses.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          You haven&apos;t created any courses yet.{" "}
          <a href="/admin/courses" className="underline">
            Create one
          </a>{" "}
          to grant access.
        </p>
      )}
    </div>
  );
}
