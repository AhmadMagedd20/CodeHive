import { AlertTriangle, TrendingUp } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { liveItemIds } from "@/lib/content/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";

export const metadata = { title: "Progress — Admin" };
export const dynamic = "force-dynamic";

function daysAgo(d: Date | null, now: number): number | null {
  if (!d) return null;
  return Math.floor((now - d.getTime()) / 86_400_000);
}

export default async function AdminProgressPage() {
  const instructor = await requireInstructor();
  const now = Date.now();

  const [courses, students] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: instructor.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.student.findMany({
      where: { instructorId: instructor.id, courseAccess: { some: {} } },
      select: {
        id: true,
        username: true,
        email: true,
        state: true,
        isInPerson: true,
        lastLearningActivityAt: true,
        courseAccess: { select: { courseId: true } },
      },
      orderBy: { username: "asc" },
    }),
  ]);

  // Attendance rate per in-person student (across their courses) for the
  // at-risk view — a low rate is another early-warning signal.
  const attendance = await prisma.attendanceRecord.findMany({
    where: { student: { instructorId: instructor.id, isInPerson: true } },
    select: { studentId: true, status: true },
  });
  const attRate = new Map<string, number>();
  {
    const tally = new Map<string, { att: number; total: number }>();
    for (const a of attendance) {
      const t = tally.get(a.studentId) ?? { att: 0, total: 0 };
      t.total += 1;
      if (a.status === "ATTENDED") t.att += 1;
      tally.set(a.studentId, t);
    }
    for (const [id, t] of tally) attRate.set(id, Math.round((t.att / t.total) * 100));
  }

  // Live item ids per course (few queries), + reverse map for tallying.
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
  const totalByCourse = new Map<string, number>();
  const itemToCourse = new Map<string, string>();
  await Promise.all(
    courses.map(async (c) => {
      const ids = await liveItemIds(c.id);
      totalByCourse.set(c.id, ids.length);
      ids.forEach((id) => itemToCourse.set(id, c.id));
    }),
  );

  // One query for all completions, then tally in memory.
  const completions = await prisma.lessonProgress.findMany({
    where: {
      status: "COMPLETED",
      studentId: { in: students.map((s) => s.id) },
      lessonItemId: { in: [...itemToCourse.keys()] },
    },
    select: { studentId: true, lessonItemId: true },
  });
  const done = new Map<string, number>(); // key `${studentId}:${courseId}`
  for (const row of completions) {
    const courseId = itemToCourse.get(row.lessonItemId);
    if (!courseId) continue;
    const key = `${row.studentId}:${courseId}`;
    done.set(key, (done.get(key) ?? 0) + 1);
  }

  const riskDays = env.AT_RISK_INACTIVE_DAYS;
  const atRisk = students
    .filter((s) => s.state === "ACTIVE")
    .map((s) => ({ s, inactive: daysAgo(s.lastLearningActivityAt, now) }))
    .filter((x) => x.inactive === null || x.inactive >= riskDays)
    .sort((a, b) => (b.inactive ?? 9999) - (a.inactive ?? 9999));

  // Flatten into per-(student, course) rows for the completion table.
  const rows = students.flatMap((s) =>
    s.courseAccess.map((a) => {
      const total = totalByCourse.get(a.courseId) ?? 0;
      const completed = done.get(`${s.id}:${a.courseId}`) ?? 0;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      return {
        studentId: s.id,
        student: s.username,
        courseId: a.courseId,
        course: courseTitle.get(a.courseId) ?? "—",
        completed,
        total,
        percent,
        inactive: daysAgo(s.lastLearningActivityAt, now),
      };
    }),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac shadow-soft">
          <TrendingUp className="h-5 w-5 text-ink" />
        </span>
        <div>
          <h1 className="font-display text-subsection">Progress</h1>
          <p className="text-sm text-muted-foreground">
            Completion per student per course, and who&apos;s falling behind.
          </p>
        </div>
      </div>

      {/* At-risk */}
      <Card className={atRisk.length ? "border-warning/30 bg-warning-soft/25" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning-strong" />
            At risk
            <Badge variant={atRisk.length ? "warning" : "success"}>{atRisk.length}</Badge>
          </CardTitle>
          <CardDescription>
            Active students with no learning activity in the last {riskDays} day
            {riskDays === 1 ? "" : "s"} — worth a check-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everyone&apos;s been active recently. 🌱</p>
          ) : (
            <ul className="divide-y">
              {atRisk.map(({ s, inactive }) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{s.username}</span>{" "}
                    <span className="text-muted-foreground">{s.email}</span>
                    {s.isInPerson && attRate.has(s.id) && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        · {attRate.get(s.id)}% attendance
                      </span>
                    )}
                  </span>
                  <Badge variant="warning">
                    {inactive === null ? "Never active" : `${inactive}d inactive`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Completion table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Course completion</CardTitle>
          <CardDescription>Each student × each course they can access.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No students with course access yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-52">Progress</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.studentId}-${r.courseId}`}>
                    <TableCell className="font-medium">{r.student}</TableCell>
                    <TableCell>{r.course}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={r.percent}
                          className="w-28"
                          tone={r.percent === 100 ? "success" : "flame"}
                        />
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.completed}/{r.total}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.inactive === null
                        ? "—"
                        : r.inactive === 0
                          ? "Today"
                          : `${r.inactive}d ago`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
