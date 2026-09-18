"use client";

import { MoonStar, ArrowDown, ArrowRight, X, Check } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "./motion";

const BEFORE = [
  "Cramming a whole semester into one all-nighter.",
  "The lecture made sense in class — gone by the time you sit down to study.",
  "Your lab test is the first time you've ever typed the flow yourself.",
  "You know you're behind, but nobody notices until the grade lands.",
];

const AFTER = [
  "You kept up all semester — each week unlocked the next, so there's nothing left to cram.",
  "You rewatched the hard part three times at your own pace. It clicked.",
  "You walk into the lab having already typed every step, line by line, with Megz.",
  "Your work gets read by a real person who tells you exactly what to fix.",
];

export function BeforeAfter() {
  return (
    <section className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-flame">
            Sound familiar?
          </p>
          <h2 className="mt-3 font-display text-section text-ink">
            Same course. Two very different semesters.
          </h2>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* before */}
          <Stagger className="relative overflow-hidden rounded-card bg-ink p-8 sm:p-10" stagger={0.09}>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-flame/25 blur-3xl"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-eyebrow uppercase text-white/80">
                <MoonStar className="h-3.5 w-3.5" /> The night before
              </span>
              <ul className="mt-7 space-y-4">
                {BEFORE.map((t) => (
                  <StaggerItem key={t}>
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-white/75">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-flame/25 text-flame">
                        <X className="h-3.5 w-3.5" />
                      </span>
                      {t}
                    </li>
                  </StaggerItem>
                ))}
              </ul>
            </div>
          </Stagger>

          {/* pivot arrow */}
          <div className="flex items-center justify-center" aria-hidden>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-flame text-white shadow-soft">
              <ArrowRight className="hidden h-6 w-6 lg:block" />
              <ArrowDown className="h-6 w-6 lg:hidden" />
            </span>
          </div>

          {/* after */}
          <Stagger
            className="relative overflow-hidden rounded-card border border-mint/50 bg-mint-soft p-8 shadow-soft sm:p-10"
            stagger={0.09}
            delayChildren={0.2}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -left-10 -top-12 h-48 w-48 rounded-full bg-mint/30 blur-3xl"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-eyebrow uppercase text-ink">
                <Check className="h-3.5 w-3.5" /> With the portal
              </span>
              <ul className="mt-7 space-y-4">
                {AFTER.map((t) => (
                  <StaggerItem key={t}>
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-ink/85">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-strong text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {t}
                    </li>
                  </StaggerItem>
                ))}
              </ul>
            </div>
          </Stagger>
        </div>
      </div>
    </section>
  );
}
