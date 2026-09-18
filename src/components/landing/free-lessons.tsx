import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/content/visibility";
import { LESSON_TYPE_META } from "@/components/lesson-type";
import { Reveal, Stagger, StaggerItem } from "./motion";

/**
 * Risk-reversal strip: real free-preview lessons, playable with no account.
 * Server component — renders nothing if no live free previews exist.
 */
export async function FreeLessons() {
  const lessons = await prisma.lessonItem.findMany({
    where: {
      isFreePreview: true,
      ...liveWhere(),
      module: {
        ...liveWhere(),
        course: { isPurchasable: true, priceCents: { not: null } },
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      module: { select: { course: { select: { id: true, title: true } } } },
    },
    take: 3,
  });
  if (lessons.length === 0) return null;

  return (
    <section id="try-a-lesson" className="relative scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-flame">
            Don&apos;t take our word for it
          </p>
          <h2 className="mt-3 font-display text-section text-ink">
            Watch a full lesson before you pay.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink/55">
            No account. No email. These are real lessons straight out of the courses — press play
            and judge the quality yourself.
          </p>
        </Reveal>

        <Stagger className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-5" stagger={0.1}>
          {lessons.map((l) => {
            const { label } = LESSON_TYPE_META[l.type];
            return (
              <StaggerItem key={l.id} className="w-full sm:w-[19rem]">
                <Link
                  href={`/catalog/${l.module.course.id}/preview/${l.id}`}
                  className="group flex h-full items-center gap-4 rounded-card border-brutal border-ink bg-white p-5 shadow-soft transition-transform duration-200 hover:-translate-y-1"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-flame text-white shadow-soft">
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-eyebrow uppercase text-flame">
                      {l.module.course.title} · {label}
                    </span>
                    <span className="mt-0.5 block font-display text-[15px] font-extrabold leading-snug tracking-display text-ink">
                      {l.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-mint-strong">
                      Free — no account needed
                    </span>
                  </span>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal delay={0.2} className="mt-8 text-center">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-flame underline-offset-4 hover:underline"
          >
            Browse all courses <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
