import Link from "next/link";
import { CalendarCheck, Zap } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceGrid } from "./attendance-grid";
import { toggleAutoReleaseAction } from "../roster/actions";

export const metadata = { title: "Attendance — Admin" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { course?: string };
}) {
  const instructor = await requireInstructor();

  const courses = await prisma.course.findMany({
    where: { instructorId: instructor.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const selectedId = searchParams.course ?? courses[0]?.id;
  const course = selectedId
    ? await prisma.course.findFirst({
        where: { id: selectedId, instructorId: instructor.id },
        include: {
          modules: { orderBy: { orderIndex: "asc" }, select: { title: true } },
        },
      })
    : null;

  // In-person students with access to this course.
  const roster = course
    ? await prisma.studentCourseAccess.findMany({
        where: { courseId: course.id, student: { isInPerson: true, instructorId: instructor.id } },
        include: {
          student: {
            select: { id: true, username: true, rosterEntry: { select: { name: true } } },
          },
        },
        orderBy: { student: { username: "asc" } },
      })
    : [];

  const records = course
    ? await prisma.attendanceRecord.findMany({
        where: { courseId: course.id, student: { isInPerson: true } },
        select: { studentId: true, week: true, status: true },
      })
    : [];

  const weeks = (course?.modules ?? []).map((m, i) => ({ week: i + 1, label: `Week ${i + 1} · ${m.title}` }));
  const students = roster.map((r) => ({
    id: r.student.id,
    username: r.student.username,
    name: r.student.rosterEntry?.name ?? r.student.username,
  }));
  const initial: Record<string, "ATTENDED" | "ABSENT" | undefined> = {};
  for (const rec of records) initial[`${rec.studentId}:${rec.week}`] = rec.status;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint shadow-soft">
          <CalendarCheck className="h-5 w-5 text-ink" />
        </span>
        <div>
          <h1 className="font-display text-subsection">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Tap a cell to cycle Attended → Absent → not recorded. Columns are the course&apos;s
            lectures (weeks).
          </p>
        </div>
      </div>

      {/* Course tabs */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Create a course first.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/admin/attendance?course=${c.id}`}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  c.id === course?.id
                    ? "border-flame bg-flame text-white shadow-lift"
                    : "border-ink/15 text-ink hover:bg-accent/50",
                )}
              >
                {c.title}
              </Link>
            ))}
          </div>

          {/* Auto-release toggle */}
          <form action={toggleAutoReleaseAction} className="mb-5">
            <button
              type="submit"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                instructor.attendanceAutoRelease
                  ? "border-highlight bg-highlight-soft text-highlight-strong"
                  : "border-ink/15 text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Zap className={cn("h-4 w-4", instructor.attendanceAutoRelease && "fill-current")} />
              Auto-release {instructor.attendanceAutoRelease ? "ON" : "OFF"}
              <span className="hidden font-normal text-muted-foreground sm:inline">
                — marking Attended releases that week&apos;s lecture to drip students
              </span>
            </button>
          </form>

          {!course || weeks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                This course has no lectures (modules) yet — add some to take weekly attendance.
              </CardContent>
            </Card>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No in-person students have access to this course yet. Grant access from a student&apos;s
                roster page.
              </CardContent>
            </Card>
          ) : (
            <AttendanceGrid
              courseId={course.id}
              students={students}
              weeks={weeks}
              initial={initial}
            />
          )}
        </>
      )}
    </div>
  );
}
