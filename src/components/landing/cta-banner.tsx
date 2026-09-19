"use client";

import Link from "next/link";
import { LandingButton } from "./cta-button";
import { Reveal } from "./motion";
import { Glow } from "./backdrop";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-ink px-4 py-24 sm:px-6">
      <Glow float className="-left-10 -top-10 h-72 w-72 bg-flame/40" />
      <Glow float className="-right-10 bottom-0 h-80 w-80 bg-lilac/30" />

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-display text-section text-white">
            Stop Re-Learning It the{" "}
            <span className="text-gradient-light animate-shimmer">Night Before.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            VOD, solved LeetCode, live lab walk-throughs, and someone actually checking in — join
            the cohort and start now.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-9 flex justify-center">
            <LandingButton href="/register" variant="onDark">
              Create Your Account
            </LandingButton>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Under a minute · free account ·{" "}
            <Link href="/free-lesson" className="font-medium text-white/85 underline-offset-4 hover:underline">
              or watch a free lesson first
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
