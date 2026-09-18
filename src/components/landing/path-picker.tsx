"use client";

import Link from "next/link";
import { Users, ShoppingBag, ArrowRight, Check } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "./motion";

/**
 * Two-path self-identification: in-person students vs. self-serve buyers.
 * Confused visitors don't convert — each card routes to its exact next step.
 */
export function PathPicker() {
  return (
    <section className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-flame">
            Two ways in
          </p>
          <h2 className="mt-3 font-display text-section text-ink">
            Which one are you?
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-6 md:grid-cols-2" stagger={0.12}>
          {/* in-person */}
          <StaggerItem>
            <div className="group relative flex h-full flex-col overflow-hidden rounded-card border-brutal border-ink bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-flame/40 sm:p-10">
              <span
                aria-hidden
                className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-flame"
              >
                <Users className="h-6 w-6 text-white" />
              </span>
              <h3 className="font-display text-subsection text-ink">
                I take classes with Megz in person
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/55">
                Your seat is already paid for. Register with the code Megz gave you, confirm your
                email, and Megz releases your lectures as you attend — <span className="font-medium text-ink">no payment on the site</span>.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink/80">
                {["Register with your code (under a minute)", "Confirm your email — you're in", "Your lectures unlock as you attend"].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" /> {s}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-flame underline-offset-4 group-hover:underline"
              >
                Create your account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </StaggerItem>

          {/* self-serve */}
          <StaggerItem>
            <div className="group relative flex h-full flex-col overflow-hidden rounded-card border-brutal border-ink bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-sunny/60 sm:p-10">
              <span
                aria-hidden
                className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sunny"
              >
                <ShoppingBag className="h-6 w-6 text-ink" />
              </span>
              <h3 className="font-display text-subsection text-ink">
                I&apos;m learning on my own
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/55">
                Pick a course from the catalog, watch a free lesson first, then pay once via
                InstaPay — <span className="font-medium text-ink">yours to keep, no subscription</span>.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink/80">
                {["Try a free lesson — no account needed", "Buy with InstaPay in two steps", "Megz confirms your payment and you're in"].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" /> {s}
                  </li>
                ))}
              </ul>
              <Link
                href="/catalog"
                className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-flame underline-offset-4 group-hover:underline"
              >
                Browse the courses <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
