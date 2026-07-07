"use client";

import { Reveal, Stagger, StaggerItem } from "./motion";
import { Glow } from "./backdrop";

const STATS = [
  { value: "4", label: "Years Teaching" },
  { value: "200+", label: "Students Helped" },
  { value: "GUC", label: "MET Graduate" },
];

export function About() {
  return (
    <section id="about" className="relative scroll-mt-20 overflow-hidden bg-sage px-4 py-24 sm:px-6">
      <Glow className="-right-16 -top-10 h-72 w-72 bg-cream/40" />
      <Glow className="-left-16 bottom-0 h-72 w-72 bg-moss/25" />

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-bark sm:text-4xl">
            Why Cohort Portal?
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-bark/85">
            I&apos;m Megz — MET graduate from GUC, and for the past 4 years I&apos;ve been teaching
            students the stuff that actually shows up in exams and interviews, not just the stuff
            that looks good on a syllabus. Over 200 students later, I built Cohort Portal to be the
            version of &ldquo;office hours&rdquo; that&apos;s actually available whenever you need it.
          </p>
        </Reveal>
      </div>

      <Stagger className="relative mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
        {STATS.map((s) => (
          <StaggerItem
            key={s.label}
            className="flex flex-col items-center rounded-2xl border border-bark/10 bg-cream/40 px-6 py-8 text-center backdrop-blur-sm"
          >
            <span className="font-display text-4xl font-semibold text-bark sm:text-5xl">
              {s.value}
            </span>
            <span className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-bark/70">
              {s.label}
            </span>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
