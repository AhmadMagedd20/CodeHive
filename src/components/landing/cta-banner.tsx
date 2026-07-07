"use client";

import { LandingButton } from "./cta-button";
import { Reveal } from "./motion";
import { Glow } from "./backdrop";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-bark px-4 py-24 sm:px-6">
      <Glow float className="-left-10 -top-10 h-72 w-72 bg-moss/40" />
      <Glow float className="-right-10 bottom-0 h-80 w-80 bg-sage/25" />

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream sm:text-5xl">
            Stop Re-Learning It the{" "}
            <span className="text-gradient-light animate-shimmer">Night Before.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">
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
        </Reveal>
      </div>
    </section>
  );
}
