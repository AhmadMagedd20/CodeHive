"use client";

import {
  Play,
  Lock,
  Check,
  Circle,
  Megaphone,
  Globe,
  AlertTriangle,
  ShieldCheck,
  MonitorSmartphone,
  MailCheck,
} from "lucide-react";

/*
 * Lightweight, stylized mock-UIs for the landing feature showcase. Not real
 * screenshots — brand-palette illustrations that echo the actual product
 * surfaces (player, locked-lecture, code editor, announcements, trust).
 */

const CARD = "rounded-card border-brutal border-ink bg-white p-4 shadow-soft";

/** 1 — Learning: a watermarked video player mid-lecture. */
export function MockPlayer() {
  return (
    <div className={CARD}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-flame text-white shadow-soft">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </span>
        <span className="pointer-events-none absolute right-3 top-3 select-none text-[9px] font-medium text-white/30">
          maya · maya@guc.edu.eg
        </span>
        <div className="absolute inset-x-3 bottom-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-[58%] rounded-full bg-ink" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
            <span>1:12:40 / 2:04:11</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium text-white">
              Resume
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-ink">Databases · Lecture 4 — Joins</p>
      <p className="text-xs text-ink/55">Watched 58% · picks up where you stopped</p>
    </div>
  );
}

/** 2 — Progression: the locked-lecture outline. */
export function MockGate() {
  const rows = [
    { label: "Lecture 1 — Relational basics", state: "done" as const },
    { label: "Lecture 2 — Joins", state: "current" as const },
    { label: "Lecture 3 — Transactions", state: "locked" as const },
  ];
  return (
    <div className={CARD}>
      <p className="mb-3 text-eyebrow uppercase text-ink/55">
        Databases
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className={
              r.state === "locked"
                ? "flex items-center gap-3 rounded-lg border border-dashed border-info/40 bg-info-soft/30 px-3 py-2.5"
                : "flex items-center gap-3 rounded-lg border-brutal border-ink bg-background px-3 py-2.5"
            }
          >
            {r.state === "done" && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
            {r.state === "current" && <Circle className="h-5 w-5 text-flame" />}
            {r.state === "locked" && <Lock className="h-4 w-4 text-sky-strong" />}
            <span
              className={
                r.state === "locked"
                  ? "text-sm font-medium text-sky-strong/80"
                  : "text-sm font-medium text-ink"
              }
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-sky-strong">
        <Lock className="h-3.5 w-3.5" /> Pass Lecture 2&apos;s assignment to unlock this lecture.
      </p>
    </div>
  );
}

/** 3 — Feedback: a code submission + written feedback. */
export function MockEditor() {
  const line = (n: number, children: React.ReactNode) => (
    <div className="flex gap-3">
      <span className="w-4 select-none text-right text-white/30">{n}</span>
      <span>{children}</span>
    </div>
  );
  return (
    <div className={CARD}>
      <div className="overflow-hidden rounded-xl bg-ink font-mono text-[11px] leading-relaxed">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-flame/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-sunny/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-mint/70" />
          <span className="ml-2 text-[10px] text-white/40">solution.sql</span>
        </div>
        <div className="space-y-0.5 p-3 text-white/80">
          {line(1, <span><span className="text-sky">SELECT</span> name</span>)}
          {line(2, <span><span className="text-sky">FROM</span> students</span>)}
          {line(3, <span><span className="text-sky">WHERE</span> gpa &gt; <span className="text-sunny">3.5</span></span>)}
          {line(4, <span><span className="text-sky">ORDER BY</span> name;</span>)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-strong">
          <Check className="h-3 w-3" /> Passed
        </span>
        <span className="text-xs text-ink/55">Attempt 2</span>
      </div>
      <div className="mt-3 rounded-lg bg-sunny-soft/50 p-3 text-xs text-ink/80">
        <span className="font-semibold text-warning-strong">Megz:</span> Clean query — nice use of
        ORDER BY. Next time, think about what happens on ties.
      </div>
    </div>
  );
}

/** 4 — Stay in the loop: announcement + at-risk nudge. */
export function MockLoop() {
  return (
    <div className="space-y-3">
      <div className={CARD}>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-sky-strong">
            <Globe className="h-3 w-3" /> All cohorts
          </span>
          <span className="text-[11px] text-ink/55">just now · emailed</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Megaphone className="h-4 w-4 text-warning-strong" /> Lab 3 walkthrough is up
        </p>
        <p className="text-xs text-ink/55">Watch it before Thursday&apos;s lab test.</p>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-warning/30 bg-warning-soft/40 px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-warning-strong">
          <AlertTriangle className="h-4 w-4" /> At risk · 11 days inactive
        </span>
        <span className="rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold text-white">
          Megz reaches out
        </span>
      </div>
    </div>
  );
}

/** 5 — Trust: private cohort + single session + watermark. */
export function MockTrust() {
  const row = (Icon: typeof ShieldCheck, label: string, value: string) => (
    <div className="flex items-center gap-3 rounded-lg border-brutal border-ink bg-background px-3 py-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-soft text-success-strong">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink/55">{value}</p>
      </div>
      <Check className="ml-auto h-4 w-4 text-success" />
    </div>
  );
  return (
    <div className={CARD}>
      <div className="space-y-2">
        {row(ShieldCheck, "Private to the cohort", "Not a public MOOC")}
        {row(MonitorSmartphone, "Signed in on 1 device", "Strict single session")}
        {row(MailCheck, "Email verified", "Real accounts only")}
      </div>
      <div className="relative mt-3 overflow-hidden rounded-xl bg-ink/90 p-4">
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/20">
          maya · maya@guc.edu.eg · maya · maya@guc.edu.eg
        </span>
        <p className="relative text-xs font-medium text-white/80">
          Every video &amp; PDF watermarked with your identity.
        </p>
      </div>
    </div>
  );
}
