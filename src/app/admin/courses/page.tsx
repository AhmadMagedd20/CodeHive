import Link from "next/link";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { createCourseAction } from "../actions";

export const metadata = { title: "Courses — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const instructor = await requireInstructor();

  const courses = await prisma.course.findMany({
    where: { instructorId: instructor.id },
    include: { _count: { select: { access: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="mb-6 font-display text-subsection">Courses</h1>
        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No courses yet. Create your first course on the right.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  {c.description && <CardDescription>{c.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">
                    {c._count.access} student{c._count.access === 1 ? "" : "s"}
                  </Badge>
                  <Link
                    href={`/admin/courses/${c.id}`}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Manage content →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg">New course</CardTitle>
          <CardDescription>Create a course you can grant to students.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCourseAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <SubmitButton className="w-full" pendingText="Creating…">
              Create course
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
