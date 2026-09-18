"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  PlayCircle,
  Code2,
  Terminal,
  BookOpen,
  RefreshCw,
  Layers,
  Lock,
  Signpost,
  FileCode2,
  FileUp,
  MessageSquareText,
  RotateCcw,
  Megaphone,
  BellRing,
  LifeBuoy,
  ShieldCheck,
  MonitorSmartphone,
  Stamp,
  MailCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE } from "./motion";
import {
  MockPlayer,
  MockGate,
  MockEditor,
  MockLoop,
  MockTrust,
} from "./feature-mocks";

type Accent = "moss" | "mist" | "clay" | "amber" | "fern";

const ACCENT: Record<
  Accent,
  { text: string; chip: string; glow: string; railOn: string; bar: string }
> = {
  moss: { text: "text-flame", chip: "bg-flame-soft text-flame-strong", glow: "bg-flame/25", railOn: "bg-flame-soft text-flame-strong", bar: "bg-flame" },
  mist: { text: "text-info-strong", chip: "bg-info-soft text-info-strong", glow: "bg-info/30", railOn: "bg-info-soft text-info-strong", bar: "bg-info" },
  clay: { text: "text-warning-strong", chip: "bg-warning-soft text-warning-strong", glow: "bg-warning/30", railOn: "bg-warning-soft text-warning-strong", bar: "bg-warning" },
  amber: { text: "text-highlight-strong", chip: "bg-highlight-soft text-highlight-strong", glow: "bg-highlight/35", railOn: "bg-highlight-soft text-highlight-strong", bar: "bg-highlight" },
  fern: { text: "text-success-strong", chip: "bg-success-soft text-success-strong", glow: "bg-success/30", railOn: "bg-success-soft text-success-strong", bar: "bg-success" },
};

type Category = {
  id: string;
  kicker: string;
  title: string;
  blurb: string;
  accent: Accent;
  Mock: () => JSX.Element;
  features: { icon: LucideIcon; text: string }[];
};

const CATEGORIES: Category[] = [
  {
    id: "learn",
    kicker: "Never miss a thing",
    title: "Miss a lecture without losing marks",
    blurb:
      "Everything Megz teaches, on demand — rewatch the parts that didn't click until they do.",
    accent: "moss",
    Mock: MockPlayer,
    features: [
      { icon: PlayCircle, text: "Rewatch any lecture, any time — pause, rewind, resume exactly where you left off." },
      { icon: Code2, text: "See how problems actually get cracked — the thinking behind every solved LeetCode, not just the answer key." },
      { icon: Terminal, text: "Sit your lab test having already typed every step — live Eclipse walkthroughs, line by line." },
      { icon: BookOpen, text: "Video, docs, and readings in one clean place — no folder full of scattered PDFs." },
      { icon: RefreshCw, text: "Matched to what's actually taught this semester — no dusty recordings." },
    ],
  },
  {
    id: "progress",
    kicker: "Mastery, not clicking next",
    title: "Exam week arrives — the work's already done",
    blurb:
      "Each lecture unlocks when you've passed the one before it, so keeping up stops being a willpower problem.",
    accent: "mist",
    Mock: MockGate,
    features: [
      { icon: Layers, text: "A clear path through every course — modules and lectures in the order that builds." },
      { icon: Lock, text: "Pass the assignment, unlock the next lecture — progress you actually earned." },
      { icon: Signpost, text: "Always know exactly where you stand and what unlocks next." },
    ],
  },
  {
    id: "feedback",
    kicker: "A human reads your work",
    title: "Know exactly what to fix — the same night",
    blurb:
      "Megz reads every submission and writes back. No autograder score, no waiting for office hours.",
    accent: "clay",
    Mock: MockEditor,
    features: [
      { icon: FileCode2, text: "Paste your code into a real in-browser editor — syntax highlighting, not a textbox." },
      { icon: FileUp, text: "Or submit a PDF — whichever the assignment calls for." },
      { icon: MessageSquareText, text: "Written feedback from Megz on every single submission — what's wrong, and why." },
      { icon: RotateCcw, text: "Didn't pass? Fix it and resubmit right away — no dead ends, no emailing anyone." },
    ],
  },
  {
    id: "loop",
    kicker: "Nothing sneaks up on you",
    title: "Deadlines stop being surprises",
    blurb:
      "Announcements and reminders land in your inbox — and if you go quiet, Megz notices before your grades do.",
    accent: "amber",
    Mock: MockLoop,
    features: [
      { icon: Megaphone, text: "Course news emailed to you the moment it's posted." },
      { icon: BellRing, text: "Due-soon reminders before an assignment can ambush you." },
      { icon: LifeBuoy, text: "Falling behind gets noticed — you get reached out to, not left behind." },
    ],
  },
  {
    id: "trust",
    kicker: "A real, private cohort",
    title: "Your seat stays yours",
    blurb:
      "Verified accounts, one device per person, watermarked content — a closed room, not an open free-for-all.",
    accent: "fern",
    Mock: MockTrust,
    features: [
      { icon: ShieldCheck, text: "Email-verified accounts and a code for in-person students — not an anonymous open platform." },
      { icon: MonitorSmartphone, text: "Strict single-device login — nobody can share (or steal) your access." },
      { icon: Stamp, text: "Video and documents watermarked with the viewer's identity." },
      { icon: MailCheck, text: "Verified, email-based accounts from day one." },
    ],
  },
];

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return setVal(to);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / 1100);
          setVal(Math.round(easeOutCubic(p) * to));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.disconnect();
      },
      { threshold: 0.7 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, reduce]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

const listVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

function FeatureRow({
  icon: Icon,
  text,
  accent,
}: {
  icon: LucideIcon;
  text: string;
  accent: Accent;
}) {
  const reduce = useReducedMotion();
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, x: -16 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
  };
  return (
    <motion.li variants={item} className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          ACCENT[accent].chip,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[15px] leading-relaxed text-ink/85">{text}</span>
    </motion.li>
  );
}

export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduce = useReducedMotion();

  // Track which panel is centered → drives the sticky rail highlight.
  useEffect(() => {
    const ios = panelRefs.current.map((el, i) => {
      if (!el) return null;
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) setActive(i);
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
      );
      io.observe(el);
      return io;
    });
    return () => ios.forEach((io) => io?.disconnect());
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const blobA = useTransform(scrollYProgress, [0, 1], [60, -80]);
  const blobB = useTransform(scrollYProgress, [0, 1], [-50, 90]);

  return (
    <section
      ref={sectionRef}
      id="what-you-get"
      className="relative scroll-mt-20 overflow-x-clip bg-paper px-4 py-24 sm:px-6"
    >
      {/* parallax ambience */}
      <motion.span
        aria-hidden
        style={reduce ? undefined : { y: blobA }}
        className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-sunny/30 blur-3xl"
      />
      <motion.span
        aria-hidden
        style={reduce ? undefined : { y: blobB }}
        className="pointer-events-none absolute -right-24 top-[55%] h-80 w-80 rounded-full bg-lilac/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-flame">
            What it does for you
          </p>
          <h2 className="mt-3 font-display text-section text-ink">
            Every feature ends in a result.
          </h2>
          <div className="mt-6 flex items-center justify-center gap-8">
            <div>
              <p className="font-display text-subsection text-ink">
                <CountUp to={5} />
              </p>
              <p className="text-eyebrow uppercase text-ink/55">feature areas</p>
            </div>
            <span className="h-10 w-px bg-ink/15" />
            <div>
              <p className="font-display text-subsection text-ink">
                <CountUp to={18} suffix="+" />
              </p>
              <p className="text-eyebrow uppercase text-ink/55">
                built-in tools &amp; protections
              </p>
            </div>
          </div>
        </div>

        {/* rail + panels */}
        <div className="mt-16 grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-14">
          {/* sticky rail (desktop only) */}
          <nav aria-label="Feature categories" className="hidden lg:block">
            <ul className="sticky top-28 space-y-1.5">
              {CATEGORIES.map((c, i) => {
                const on = i === active;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() =>
                        panelRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300",
                        on ? ACCENT[c.accent].railOn : "text-ink/55 hover:bg-ink/5",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                          on ? cn(ACCENT[c.accent].bar, "text-white") : "bg-ink/10 text-ink/60",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className={cn("text-sm font-medium", on && "font-semibold")}>
                        {c.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* panels */}
          <div className="space-y-16 lg:space-y-0">
            {CATEGORIES.map((c, i) => (
              <div
                key={c.id}
                ref={(el) => {
                  panelRefs.current[i] = el;
                }}
                className="scroll-mt-28 lg:flex lg:min-h-[78vh] lg:flex-col lg:justify-center lg:py-10"
              >
                <p className={cn("text-eyebrow uppercase", ACCENT[c.accent].text)}>
                  {c.kicker}
                </p>
                <h3 className="mt-2 font-display text-subsection text-ink">
                  {c.title}
                </h3>
                <p className="mt-2 max-w-xl text-ink/55">{c.blurb}</p>

                <div className="mt-8 grid items-center gap-8 lg:grid-cols-2">
                  <motion.ul
                    variants={listVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    className="space-y-4 lg:order-1"
                  >
                    {c.features.map((f) => (
                      <FeatureRow key={f.text} icon={f.icon} text={f.text} accent={c.accent} />
                    ))}
                  </motion.ul>

                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="relative lg:order-2"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -inset-6 -z-10 rounded-[2rem] blur-2xl",
                        ACCENT[c.accent].glow,
                      )}
                    />
                    <c.Mock />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
