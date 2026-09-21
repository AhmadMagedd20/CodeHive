"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play, Check, Flame, Lock } from "lucide-react";
import { LandingButton } from "./cta-button";
import { WordsHeading, Reveal } from "./motion";
import { DotGrid, Glow } from "./backdrop";
import { HeroPlayer } from "./hero-player";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { whatsappLink, WHATSAPP_MESSAGES } from "@/lib/whatsapp";

/** Public hero preview video, when one has been uploaded in admin settings. */
export type HeroVideoProps = { src: string; poster: string | null } | null;

/** Small floating proof-moment chips around the hero visual. */
function FloatChip({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6 + delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 5 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** The "exam-day" visual: a lesson player surrounded by success moments. */
function HeroVisual({ heroVideo }: { heroVideo: HeroVideoProps }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* ghost display type behind the cluster */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-14 select-none font-display text-[7.5rem] font-black leading-none tracking-hero text-ink/[0.05] sm:text-[9rem]"
      >
        calm.
      </span>

      {/* main player card */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-card border-brutal border-ink bg-white p-4 shadow-soft"
      >
        {heroVideo ? (
          <HeroPlayer src={heroVideo.src} poster={heroVideo.poster} />
        ) : (
          /* Placeholder until a hero video is uploaded in admin settings —
             the original static mock, never a broken player. */
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink">
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-flame text-white shadow-soft">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </span>
            <span className="pointer-events-none absolute right-3 top-3 select-none text-[9px] font-medium text-white/30">
              you · you@guc.edu.eg
            </span>
            <div className="absolute inset-x-3 bottom-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[92%] rounded-full bg-flame" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
                <span>Lecture 6 — the one before the exam</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium text-white">
                  Rewatch
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Databases · Exam prep</p>
            <p className="text-xs text-ink/55">Rewatched the hard part 3×. It clicked.</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint font-display text-xs font-extrabold tracking-display text-ink">
            92%
          </span>
        </div>
      </motion.div>

      {/* floating success moments */}
      <FloatChip delay={0.1} className="absolute -left-4 -top-6 sm:-left-10">
        <div className="flex items-center gap-2 rounded-full border-brutal border-ink bg-white px-3.5 py-2 shadow-soft">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint text-ink">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold text-ink">
            Assignment passed <span className="font-normal text-ink/55">— Week 3 unlocked</span>
          </span>
          <Lock className="h-3.5 w-3.5 text-mint-strong [transform:rotate(-8deg)]" />
        </div>
      </FloatChip>

      <FloatChip delay={0.35} className="absolute -bottom-5 -right-2 sm:-right-8">
        <div className="flex items-center gap-2 rounded-full border-brutal border-ink bg-white px-3.5 py-2 shadow-soft">
          <Flame className="h-4 w-4 text-flame" />
          <span className="text-xs font-semibold text-ink">
            Kept up all semester <span className="font-normal text-ink/55">— nothing to cram</span>
          </span>
        </div>
      </FloatChip>
    </div>
  );
}

export function Hero({ heroVideo = null }: { heroVideo?: HeroVideoProps }) {
  // null when NEXT_PUBLIC_WHATSAPP_NUMBER is unset — the button then isn't rendered.
  const whatsappHref = whatsappLink(WHATSAPP_MESSAGES.general);
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <DotGrid className="opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <Glow float className="-left-24 top-10 h-96 w-96 bg-sunny/40" />
      <Glow float className="-right-20 top-40 h-80 w-80 bg-lilac/40" />
      <Glow float className="left-1/3 top-1/2 h-72 w-72 bg-sky/30" />

      {/*
       * Two changes here, both so the three CTA pills sit on ONE line at full
       * size — the row needs 632px and will not shrink below it.
       *
       * 1. Text column widened 1.05fr -> 1.4fr. Measured: 1.05fr gave 570px,
       *    and 1.3fr came up 3px short at 629px, so this is deliberately
       *    1.4fr (~649px) rather than a value tuned to the exact pixel that a
       *    different font-loading state could undo.
       *
       * 2. The ratio is per-breakpoint, because one value cannot serve both
       *    ends. At 1024 the container is only 976px wide, so 1.4fr left the
       *    text column at 546px and the row still wrapped; 2.3fr gets it to
       *    ~652px. Applying 2.3fr everywhere would then waste a big screen —
       *    at 1280+ it would leave the player at ~337px for no reason — so
       *    `xl` drops back to 1.4fr once the container has hit its max-w-6xl
       *    1152px and the text column is a stable 649px.
       *
       * The player pays for this between 1024 and 1279 (~284px wide there,
       * ~463px from 1280 up). Deliberate: the instructor chose a smaller
       * player over the hero ever stacking. It is aspect-video, so it simply
       * scales — no change of its own.
       */}
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[2.3fr_1fr] lg:gap-10 xl:grid-cols-[1.4fr_1fr]">
        {/* copy */}
        <div className="text-center lg:text-left">
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {["MET, GUC '25", "4 years teaching", "200+ students"].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sunny px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink"
                >
                  <Check className="h-3 w-3" /> {chip}
                </span>
              ))}
            </div>
          </Reveal>

          <WordsHeading
            className="mt-6 font-display text-hero text-ink"
            segments={[
              { text: "Walk into the exam" },
              { br: true },
              { text: "already", gradient: true },
              { text: "knowing it." },
            ]}
          />

          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg lg:mx-0">
              Megz&apos;s VOD lectures, solved problems, and live lab walkthroughs — for GUC &amp;
              GIU students. Rewatch until it clicks, get real feedback on your work, and stop
              meeting the material for the first time the night before.
            </p>
          </Reveal>

          <Reveal delay={0.28}>
            {/*
             * `flex-wrap` + `whitespace-nowrap` on each button, together.
             *
             * With three buttons the row no longer fits the hero column, and a
             * non-wrapping flex row shrinks its items instead: the labels broke
             * onto two lines and the pills looked squashed. Stopping the text
             * wrapping fixes the width too — a flex item will not shrink below
             * its min-content size, which for a nowrap label is the full label
             * width. The row then breaks onto a second line when it must, and
             * every button keeps its natural size.
             */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <LandingButton href="/register" className="whitespace-nowrap">
                Create Your Account
              </LandingButton>
              <LandingButton href="/free-lesson" variant="secondary" className="whitespace-nowrap">
                <Play className="h-4 w-4 fill-current" /> Watch a Free Lesson
              </LandingButton>
              {/*
               * Not a LandingButton: this one keeps WhatsApp's own green so it
               * reads instantly as "this opens WhatsApp", which is the whole
               * point of putting it here. It still carries the 2px ink border
               * and pill shape, so it sits in the row as a sibling rather than
               * a foreign object. Renders nothing when the number is unset.
               */}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with Megz on WhatsApp"
                  className={[
                    // Auto width, matching the two LandingButtons beside it —
                    // they are auto-width and centred at every breakpoint, so a
                    // full-width third button would break the row.
                    // h-12 px-7 text-base mirrors LandingButton's "lg" size
                    // exactly, so all three pills are the same height.
                    // whitespace-nowrap: the label wrapped to two lines in the
                    // narrow hero column and overflowed the fixed-height pill.
                    "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-7 text-base",
                    "rounded-full border-brutal border-ink bg-[#25D366]",
                    "font-semibold text-white shadow-soft",
                    "outline-none focus-visible:ring-4 focus-visible:ring-ink/25",
                    "transition-transform duration-200 motion-safe:hover:scale-[1.03] motion-safe:active:scale-95",
                  ].join(" ")}
                >
                  {/* Just "WhatsApp": the logo beside it already says "chat",
                      and the shorter label is what lets all three pills share
                      one line without shrinking any of them. */}
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
            <p className="mt-3 text-sm text-ink/55">
              Takes under a minute — and the free lesson needs no account at all.
            </p>
          </Reveal>
        </div>

        {/* visual */}
        <HeroVisual heroVideo={heroVideo} />
      </div>

      {/* subtle scroll cue */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="relative mx-auto mt-20 h-10 w-6 rounded-full border-2 border-ink/20"
      >
        <motion.span
          className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-flame"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
