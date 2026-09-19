import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { CourseBuilder, type ModuleDTO } from "./builder";
import { videoProvider } from "@/lib/video";
import { PricingFields } from "./pricing-fields";
import { updateCourseSettings } from "./actions";

export const metadata = { title: "Course builder" };
export const dynamic = "force-dynamic";

export default async function CourseBuilderPage({ params }: { params: { courseId: string } }) {
  const instructor = await requireInstructor();

  const course = await prisma.course.findFirst({
    where: { id: params.courseId, instructorId: instructor.id },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          items: {
            orderBy: { orderIndex: "asc" },
            include: {
              video: { select: { id: true } },
              quiz: { select: { id: true } },
              assignment: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const modules: ModuleDTO[] = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    isPublished: m.isPublished,
    publishAt: m.publishAt?.toISOString() ?? null,
    prerequisiteModuleId: m.prerequisiteModuleId,
    priceCents: m.priceCents,
    salePriceCents: m.salePriceCents,
    items: m.items.map((it) => ({
      id: it.id,
      type: it.type,
      title: it.title,
      isPublished: it.isPublished,
      isFreePreview: it.isFreePreview,
      isExtra: it.isExtra,
      publishAt: it.publishAt?.toISOString() ?? null,
      body: it.body,
      chapters: it.chapters,
      hasContent:
        it.type === "RICH_TEXT"
          ? !!it.body
          : !!(it.video || it.documentId || it.quiz || it.assignment),
    })),
  }));

  // Pre-fill the sale-price field: the exact stored sale price, or one derived
  // from a legacy percent discount (so older courses round-trip cleanly).
  const saleDefault =
    course.salePriceCents ??
    (course.priceCents != null && course.discountPercent
      ? Math.round((course.priceCents * (100 - course.discountPercent)) / 100)
      : null);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/courses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <h1 className="mb-1 font-display text-subsection">{course.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Build the course outline — add modules and lesson items, reorder them, and publish or
        schedule each one. Students only see published items.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Course settings</CardTitle>
          <CardDescription>Title, description, category, university, and gating.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateCourseSettings} className="space-y-4">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={course.title} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={course.category ?? ""}
                  placeholder="e.g. Computer Science"
                />
                <p className="text-xs text-muted-foreground">
                  Shown as the card tag and used by the student dashboard&apos;s filter pills.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="university">University</Label>
                <Select id="university" name="university" defaultValue={course.university ?? ""}>
                  <option value="">Any / not set</option>
                  <option value="GUC">GUC</option>
                  <option value="GIU">GIU</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={course.description ?? ""} rows={2} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="gatingEnabled" name="gatingEnabled" defaultChecked={course.gatingEnabled} className="mt-0.5" />
              <Label htmlFor="gatingEnabled" className="text-sm font-normal leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">Sequential gating</span> — lock each
                lecture until the previous lecture&apos;s gating assignment is passed. Turn off for
                open reference courses.
              </Label>
            </div>

            <div className="rounded-lg border-brutal border-ink bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="isPurchasable"
                  name="isPurchasable"
                  defaultChecked={course.isPurchasable}
                  className="mt-0.5"
                />
                <Label htmlFor="isPurchasable" className="text-sm font-normal leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">Sell this course</span> — list it in
                  the public catalog so self-serve students can buy it via InstaPay. In-person
                  students are still granted access manually.
                </Label>
              </div>
              <PricingFields
                defaultPrice={course.priceCents != null ? course.priceCents / 100 : ""}
                defaultSalePrice={saleDefault != null ? saleDefault / 100 : ""}
              />
            </div>

            <div className="rounded-lg border-brutal border-ink bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="comingSoon"
                  name="comingSoon"
                  defaultChecked={course.comingSoon}
                  className="mt-0.5"
                />
                <Label htmlFor="comingSoon" className="text-sm font-normal leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">Coming soon</span> — show it in the
                  catalog with a “Coming soon” badge so students know what&apos;s next. Works even
                  without “Sell this course”. Buying is blocked until you turn this off; free-preview
                  lessons still work as a taster.
                </Label>
              </div>
            </div>

            <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-3 font-display text-card-title">Outline</h2>
      <CourseBuilder courseId={course.id} modules={modules} videoMode={videoProvider.playback} />
    </div>
  );
}
