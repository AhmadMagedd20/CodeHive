import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { youtubeEmbedUrl } from "@/lib/video/youtube";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { DotGrid, Glow } from "@/components/landing/backdrop";
import { LandingButton } from "@/components/landing/cta-button";
import { Reveal } from "@/components/landing/motion";

// The root layout applies the "%s — Cohort Portal" template, so the suffix
// must not be repeated here.
export const metadata = {
  title: "Free lesson",
  description: "Watch a full lesson free. No account, no payment, no email.",
};

/**
 * The public free lesson — where the landing page's "Watch a Free Lesson"
 * buttons land.
 *
 * Cached for 5 minutes, on the same reasoning as the landing page and catalog:
 * this is one row of instructor settings rendered identically for everyone,
 * and nothing here reads `cookies()`, `headers()` or the session. Saving a new
 * link in admin calls `revalidatePath("/free-lesson")`, so an edit appears
 * immediately rather than waiting out the window.
 */
export const revalidate = 300;

export default async function FreeLessonPage() {
  const instructor = await prisma.instructor.findFirst({
    where: { freeLessonVideoId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { freeLessonVideoId: true, freeLessonTitle: true, freeLessonBlurb: true },
  });

  const videoId = instructor?.freeLessonVideoId ?? null;

  return (
    <div className="texture-grain relative min-h-screen overflow-x-clip bg-paper text-ink">
      <Navbar />

      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
          {/* Same backdrop treatment as the landing hero, so arriving here
              reads as the same site rather than a bare utility page. */}
          <DotGrid className="opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <Glow float className="-left-24 top-10 h-96 w-96 bg-sunny/40" />
          <Glow float className="-right-20 top-40 h-80 w-80 bg-lilac/40" />
          <Glow float className="left-1/3 top-1/2 h-72 w-72 bg-sky/30" />

          <div className="relative mx-auto max-w-4xl">
            <Reveal className="text-center">
              <p className="text-eyebrow uppercase text-flame">Free — no account needed</p>
              <h1 className="mt-3 font-display text-section text-ink">
                {instructor?.freeLessonTitle ?? "Watch a full lesson, free."}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
                {instructor?.freeLessonBlurb ??
                  "A real lesson straight out of the course — not a trailer. Press play and judge the teaching for yourself."}
              </p>
            </Reveal>

            {videoId ? (
              <Reveal delay={0.15} className="mt-12">
                <div className="overflow-hidden rounded-card border-brutal border-ink bg-ink shadow-soft">
                  <iframe
                    src={youtubeEmbedUrl(videoId)}
                    title={instructor?.freeLessonTitle ?? "Free lesson"}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="block aspect-video w-full border-0"
                  />
                </div>
              </Reveal>
            ) : (
              /* No link set yet. Say so plainly and keep the visitor moving,
                 rather than showing a broken player or an empty black box. */
              <Reveal delay={0.15} className="mt-12">
                <div className="flex flex-col items-center gap-4 rounded-card border-brutal border-ink bg-white px-6 py-16 text-center shadow-soft">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lilac-soft">
                    <Lock className="h-6 w-6 text-lilac-strong" />
                  </span>
                  <p className="max-w-sm text-ink/70">
                    The free lesson is being put together right now. In the meantime, every
                    course page lists exactly what&apos;s inside.
                  </p>
                  <LandingButton href="/catalog">
                    Browse the courses <ArrowRight className="h-4 w-4" />
                  </LandingButton>
                </div>
              </Reveal>
            )}

            {videoId && (
              <Reveal delay={0.25} className="mt-10 text-center">
                <p className="text-sm text-ink/60">
                  Liked it? The full course picks up right where this leaves off.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <LandingButton href="/catalog">
                    See the courses <ArrowRight className="h-4 w-4" />
                  </LandingButton>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 self-center text-sm font-semibold text-flame underline-offset-4 hover:underline"
                  >
                    Create an account
                  </Link>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
