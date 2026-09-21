"use client";

import { UserPlus, MailCheck, type LucideIcon } from "lucide-react";
import { LandingButton } from "./cta-button";
import { Reveal } from "./motion";

/**
 * Two steps with oversized ghost numerals — register, confirm email, done.
 * A confirmed email is all it takes; there's no manual approval step.
 */
const STEPS: { icon: LucideIcon; num: string; title: string; body: string }[] = [
  {
    icon: UserPlus,
    num: "01",
    title: "Create your account",
    body: "Username, email, password — under a minute, free. Taking classes with Megz in person? Drop in the code you were given and the whole portal is free with your seat.",
  },
  {
    icon: MailCheck,
    num: "02",
    title: "Confirm your email — you're in",
    body: "One click from your inbox and your account is ready. No waiting on approval — sign in and start straight away.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 overflow-hidden bg-sunny-soft px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-flame">How it works</p>
          <h2 className="mt-3 font-display text-section text-ink">
            Two steps. One of them is an email click.
          </h2>
        </Reveal>

        <div className="mt-16 space-y-4">
          {STEPS.map(({ icon: Icon, num, title, body }, i) => (
            <Reveal key={num} delay={i * 0.1}>
              <div className="relative flex items-start gap-5 overflow-hidden rounded-3xl border-brutal border-ink bg-white p-7 shadow-soft sm:items-center sm:gap-8 sm:p-9">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-8 select-none font-display text-[7rem] font-black leading-none tracking-hero text-ink/[0.05] sm:text-[8.5rem]"
                >
                  {num}
                </span>
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-flame shadow-soft">
                  <Icon className="h-6 w-6 text-white" />
                </span>
                <div className="relative max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-flame">
                    Step {num}
                  </p>
                  <h3 className="mt-1 font-display text-card-title text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/55 sm:text-[15px]">
                    {body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-10 text-center">
          <LandingButton href="/register">Create Your Account</LandingButton>
          <p className="mt-3 text-sm text-ink/55">
            Buying a course on your own? Register, then pay via InstaPay — Megz confirms your
            payment and you&apos;re in.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
