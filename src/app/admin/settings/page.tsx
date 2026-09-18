import { Settings } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroVideoForm } from "./hero-video-form";

export const metadata = { title: "Site settings — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const instructor = await requireInstructor();
  const me = await prisma.instructor.findUniqueOrThrow({
    where: { id: instructor.id },
    select: {
      heroVideoFilename: true,
      heroVideoStatus: true,
      heroPosterAssetId: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac shadow-soft">
          <Settings className="h-5 w-5 text-ink" />
        </span>
        <div>
          <h1 className="font-display text-subsection">Site settings</h1>
          <p className="text-sm text-muted-foreground">
            Public-facing bits of the site that aren&apos;t tied to a course.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Landing page hero preview video</CardTitle>
          <CardDescription>
            The clip that plays in the hero on the public home page. Anyone can watch it — no
            account needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeroVideoForm
            filename={me.heroVideoFilename}
            status={me.heroVideoStatus}
            hasPoster={me.heroPosterAssetId != null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
