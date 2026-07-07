"use client";

import { UserPlus, MailCheck, ShieldCheck, GraduationCap, type LucideIcon } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "./motion";

const STEPS: { icon: LucideIcon; step: string; title: string; body: string }[] = [
  {
    icon: UserPlus,
    step: "Step 1",
    title: "Sign Up",
    body: "Create your Cohort Portal account in under a minute with your university email.",
  },
  {
    icon: MailCheck,
    step: "Step 2",
    title: "Verify Your Email",
    body: "Click the confirmation link so we know it's really you.",
  },
  {
    icon: ShieldCheck,
    step: "Step 3",
    title: "Get Approved",
    body: "Megz personally reviews and approves every account — so this stays a real, focused cohort, not an open sign-up.",
  },
  {
    icon: GraduationCap,
    step: "Step 4",
    title: "Start Learning",
    body: "Log in and your dashboard is ready: your courses, your VODs, your pace.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 bg-fog px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">How It Works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-bark sm:text-4xl">
            From sign-up to studying in four steps.
          </h2>
        </Reveal>

        <div className="relative mt-16">
          {/* connector line (desktop) */}
          <div className="absolute left-[12%] right-[12%] top-8 hidden h-0.5 bg-bark/15 lg:block" />

          <Stagger
            className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.15}
          >
            {STEPS.map(({ icon: Icon, step, title, body }) => (
              <StaggerItem key={title} className="flex flex-col items-center text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-moss text-cream shadow-[0_8px_24px_-8px_rgba(52,64,42,0.5)] ring-8 ring-fog">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-moss">
                  {step}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-semibold text-bark">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-bark/70">{body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
