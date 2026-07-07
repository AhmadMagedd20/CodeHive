"use client";

import { PlayCircle, Code, Terminal, MessageCircle, RefreshCw, Lock, type LucideIcon } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "./motion";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: PlayCircle,
    title: "VOD — Watch Anytime, Anywhere",
    body: "Every session recorded and ready whenever you are. Missed a class, need a rewatch before an exam, or learn better at 2am? It's all there, on your schedule, not mine.",
  },
  {
    icon: Code,
    title: "LeetCode, Solved and Explained",
    body: "A growing bank of LeetCode problems with full solutions — not just the answer, but the thinking behind it, so you actually walk away able to solve the next one yourself.",
  },
  {
    icon: Terminal,
    title: "Lab Prep, Line by Line",
    body: "Dedicated VOD sessions where I open up Eclipse and solve it live — exactly what to type, exactly why, exactly when. Walk into your lab test having already seen it done.",
  },
  {
    icon: MessageCircle,
    title: "Continuous Follow-Up",
    body: "This isn't upload-and-disappear. I stay in the loop with you, so if something's not clicking, it gets caught early — not the night before the exam.",
  },
  {
    icon: RefreshCw,
    title: "Always Up to Date",
    body: "Content gets refreshed regularly to match what's actually being taught and asked — no dusty videos from three semesters ago.",
  },
  {
    icon: Lock,
    title: "Your Own Cohort, Your Own Access",
    body: "Your account is personally approved, and your dashboard only shows the courses assigned to you — a focused cohort space, not a free-for-all.",
  },
];

export function Features() {
  return (
    <section id="what-you-get" className="relative scroll-mt-20 bg-paper px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">What You Get</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-bark sm:text-4xl">
            Everything the night-before panic never gave you.
          </h2>
        </Reveal>

        <Stagger className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <div className="group h-full rounded-2xl border border-sage/50 bg-fog p-7 shadow-hairline transition-all duration-300 hover:-translate-y-1 hover:border-moss/60 hover:shadow-[0_18px_44px_-16px_rgba(111,126,91,0.5)]">
                <div className="flex h-14 w-12 items-end justify-center rounded-arch bg-sage pb-2.5 text-bark transition-colors duration-300 group-hover:bg-moss group-hover:text-cream">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-bark">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-bark/70">{body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
