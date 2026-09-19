import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isLive } from "@/lib/content/visibility";
import { videoProvider } from "@/lib/video";
import { storage } from "@/lib/storage";
import { PublicHeader } from "@/components/public-header";
import { Markdown } from "@/components/markdown";
import { VideoPlayer } from "@/components/video-player";
import { PdfViewer } from "@/components/pdf-viewer";
import { LandingButton } from "@/components/landing/cta-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE_META } from "@/components/lesson-type";

export const metadata = { title: "Free preview" };
export const dynamic = "force-dynamic";

export default async function FreePreviewPage({
  params,
}: {
  params: { courseId: string; itemId: string };
}) {
  const item = await prisma.lessonItem.findFirst({
    where: {
      id: params.itemId,
      isFreePreview: true,
      module: { courseId: params.courseId, course: { isPurchasable: true } },
    },
    include: { module: { include: { course: { select: { id: true, title: true } } } }, video: true, document: true },
  });
  if (!item || !isLive(item) || !isLive(item.module)) notFound();

  const { Icon, label } = LESSON_TYPE_META[item.type];
  const watermark = "Cohort Portal · free preview";
  const videoUrl = item.type === "VIDEO" && item.video ? await videoProvider.getStreamUrl(item.video) : null;
  const docUrl = item.type === "DOCUMENT" && item.document ? await storage.getUrl(item.document.storageKey) : null;

  return (
    <div className="texture-grain min-h-screen bg-paper text-ink">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href={`/catalog/${params.courseId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {item.module.course.title}
        </Link>

        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sunny px-2.5 py-1 text-eyebrow uppercase text-ink">
            <Icon className="h-3.5 w-3.5" /> {label}
          </span>
          <Badge variant="highlight">Free preview</Badge>
        </div>
        <h1 className="mb-6 font-display text-subsection">{item.title}</h1>

        {item.type === "VIDEO" &&
          (videoUrl ? (
            /*
             * Branch on the provider's playback KIND, exactly as the lesson
             * page does. This page previously rendered <VideoPlayer> whatever
             * the provider was, so under VIDEO_PROVIDER=youtube it fed a
             * YouTube *embed URL* into a <video src> and drew nothing at all —
             * marking a lesson "free preview" produced a blank player.
             *
             * Unlike the lesson page this passes no lessonItemId: a preview is
             * public, so there is no signed-in student whose progress could be
             * recorded, and beaconing anonymous progress would write rows that
             * belong to nobody.
             */
            videoProvider.playback === "youtube" ? (
              <div className="overflow-hidden rounded-2xl border-brutal border-ink bg-ink">
                <iframe
                  src={videoUrl}
                  title={item.title}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="block aspect-video w-full border-0"
                />
              </div>
            ) : (
              <VideoPlayer src={videoUrl} watermark={watermark} lessonItemId={item.id} initialPosition={0} />
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This preview video isn&apos;t available yet.
              </CardContent>
            </Card>
          ))}

        {item.type === "DOCUMENT" &&
          (docUrl ? (
            <PdfViewer src={docUrl} watermark={watermark} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This preview document isn&apos;t available yet.
              </CardContent>
            </Card>
          ))}

        {item.type === "RICH_TEXT" &&
          (item.body ? (
            <Markdown content={item.body} />
          ) : (
            <p className="text-muted-foreground">This reading has no content yet.</p>
          ))}

        {(item.type === "QUIZ" || item.type === "ASSIGNMENT") && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Create your account and enroll to try the {label.toLowerCase()}s in this course.
            </CardContent>
          </Card>
        )}

        {/* upsell */}
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-sunny/50 bg-sunny-soft/60 p-8 text-center">
          <Sparkles className="h-6 w-6 text-sunny-strong" />
          <p className="font-display text-lg font-extrabold tracking-display">Like what you see?</p>
          <p className="max-w-sm text-sm text-ink/80">
            This is just one free lesson. Enroll to unlock every lecture, the solved LeetCode bank,
            and feedback from Megz.
          </p>
          <LandingButton href={`/catalog/${params.courseId}`}>Get the full course</LandingButton>
        </div>
      </main>
    </div>
  );
}
