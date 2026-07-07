"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { LandingButton } from "./cta-button";
import { WordsHeading, Reveal } from "./motion";
import { DotGrid, Glow } from "./backdrop";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-36 sm:px-6 sm:pt-44">
      <DotGrid className="opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <Glow float className="-left-24 top-10 h-96 w-96 bg-fern/30" />
      <Glow float className="-right-20 top-40 h-80 w-80 bg-amber/25" />
      <Glow float className="left-1/3 top-1/2 h-72 w-72 bg-clay/15" />

      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber/50 bg-amber-soft/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-amber-strong shadow-hairline backdrop-blur-sm">
            MET, GUC &apos;22 · 4 Years Teaching · 200+ Students Guided
          </span>
        </Reveal>

        <WordsHeading
          className="mt-7 font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-bark sm:text-6xl lg:text-7xl"
          segments={[
            { text: "Learn It Once." },
            { br: true },
            { text: "Actually", gradient: true },
            { text: "Get It." },
          ]}
        />

        <Reveal delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">
            Cohort Portal is where Megz&apos;s students get everything in one place — VOD sessions,
            solved LeetCode, live lab walk-throughs, and real follow-up. Built by a MET grad
            who&apos;s spent 4 years turning confused students into ones who walk into exams calm.
          </p>
        </Reveal>

        <Reveal delay={0.28}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LandingButton href="/register">Create Your Account</LandingButton>
            <LandingButton href="/login" variant="secondary">
              Already Approved? Log In
            </LandingButton>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-bark/55">
            <ShieldCheck className="h-4 w-4 text-moss" />
            Reviewed and approved by Megz — no random sign-ups, no noise.
          </p>
        </Reveal>
      </div>

      {/* subtle scroll cue */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="relative mx-auto mt-16 h-10 w-6 rounded-full border-2 border-bark/20"
      >
        <motion.span
          className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-moss"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
