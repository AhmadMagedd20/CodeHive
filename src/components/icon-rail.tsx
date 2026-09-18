"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { LogOut, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * The shared left icon rail — used by BOTH the student shell and the admin
 * shell, so the dock behaviour lives in exactly one place.
 *
 * Interaction:
 *  - Tooltips: CSS-only (`group-hover` / `group-focus-within` + an enter-only
 *    transition delay), so hovering never triggers a React render.
 *  - Magnification: macOS-Dock style, driven by one rAF loop that writes
 *    `transform` straight to the DOM from the cursor's distance to each icon.
 *    No React state and no MotionValues, so a mouse sweep across the rail
 *    causes ZERO re-renders — only compositor-level transforms.
 *  - We animate `scale` (a transform) rather than width/height on purpose:
 *    transforms don't dirty layout, so nothing inside or outside the rail
 *    reflows, and with 10 admin items the rail can't overflow its own height.
 *  - Skipped entirely under `prefers-reduced-motion` and on devices without a
 *    real cursor; tooltips still work in both cases.
 */

export type RailNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  /** Unread count — renders the small flame dot. */
  badge?: number;
};

/** Cursor-distance falloff: full size at the cursor, back to normal ~2 icons away. */
const FALLOFF_PX = 112;
const MAX_SCALE = 1.42;
const MAX_NUDGE_PX = 7;
/** Eases current → target each frame; higher is snappier. */
const EASING = 0.22;

/**
 * Dock falloff, as a pure function so the taper is testable without a
 * compositor: full magnification under the cursor, easing back to 1 about two
 * icons away. `distancePx` is |cursorY − iconCentreY|.
 */
export function dockScaleFor(distancePx: number): number {
  const t = Math.max(0, 1 - Math.abs(distancePx) / FALLOFF_PX);
  return 1 + (MAX_SCALE - 1) * t;
}

/**
 * Drives the dock magnification with a single rAF loop that writes transforms
 * straight to the DOM.
 *
 * No React state and no MotionValues are involved, so a mouse sweep across the
 * rail causes ZERO re-renders — just one loop writing `transform` on ~11 nodes,
 * which the compositor handles. Transforms never dirty layout, so nothing inside
 * or outside the rail reflows. The loop only runs while the cursor is over the
 * rail (plus a short settle), and never starts at all when magnification is off.
 */
function useDock(enabled: boolean) {
  const railRef = useRef<HTMLElement>(null);
  const cursorY = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const scales = useRef<number[]>([]);

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const run = () => {
    const rail = railRef.current;
    if (!rail) return stop();
    const icons = Array.from(rail.querySelectorAll<HTMLElement>("[data-dock-icon]"));
    let settled = true;

    icons.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const y = cursorY.current;
      // Target magnification: 1 at the cursor, tapering to 0 two icons away.
      const target = y === null ? 1 : dockScaleFor(y - (r.top + r.height / 2));
      const current = scales.current[i] ?? 1;
      const next = current + (target - current) * EASING;
      scales.current[i] = next;

      if (Math.abs(target - next) > 0.001) settled = false;
      const nudge = ((next - 1) / (MAX_SCALE - 1)) * MAX_NUDGE_PX;
      el.style.transform = `translateX(${nudge.toFixed(2)}px) scale(${next.toFixed(4)})`;
    });

    // Keep animating until everything has reached its target.
    if (!settled || cursorY.current !== null) {
      frame.current = requestAnimationFrame(run);
    } else {
      icons.forEach((el) => (el.style.transform = ""));
      scales.current = [];
      stop();
    }
  };

  const onMouseMove = enabled
    ? (e: React.MouseEvent) => {
        cursorY.current = e.clientY;
        if (frame.current === null) frame.current = requestAnimationFrame(run);
      }
    : undefined;

  const onMouseLeave = enabled
    ? () => {
        cursorY.current = null; // lets the loop ease everything back, then stop
      }
    : undefined;

  useEffect(() => stop, []);

  return { railRef, onMouseMove, onMouseLeave };
}

/** Label pill shown to the right of an icon on hover / keyboard focus. */
function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap",
        "rounded-lg border-brutal border-ink bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow-soft",
        // Enter: slight slide + fade after a short delay. Leave: instant
        // (the base state carries delay-0, and CSS uses the *target* delay).
        "translate-x-[-4px] opacity-0 transition-[opacity,transform] duration-150 delay-0",
        "group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-300",
        "group-focus-within:translate-x-0 group-focus-within:opacity-100 group-focus-within:delay-0",
      )}
    >
      {label}
    </span>
  );
}

function DockItem({ item }: { item: RailNavItem }) {
  const Icon = item.icon;

  return (
    <span className="group relative flex items-center justify-center">
      <span data-dock-icon className="flex will-change-transform">
        <Link
          href={item.href}
          aria-label={item.label}
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
            item.active ? "bg-sunny text-ink" : "text-white/55 hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
          {item.badge ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-flame ring-2 ring-ink" />
          ) : null}
        </Link>
      </span>
      <Tooltip label={item.label} />
    </span>
  );
}

function DockLogout() {
  return (
    <span className="group relative mt-2 flex items-center justify-center">
      <span data-dock-icon className="flex will-change-transform">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </form>
      </span>
      <Tooltip label="Sign out" />
    </span>
  );
}

export function IconRail({
  items,
  logoHref,
  logoLabel,
  mobileScrollable = false,
  logoutInMobile = false,
}: {
  items: RailNavItem[];
  logoHref: string;
  logoLabel: string;
  /** Admin has many sections — its mobile bar scrolls instead of spreading. */
  mobileScrollable?: boolean;
  logoutInMobile?: boolean;
}) {
  const reduce = useReducedMotion();
  const [hasCursor, setHasCursor] = useState(false);

  // Only magnify where there's a real pointer — no faking hover on touch.
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHasCursor(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const magnify = hasCursor && !reduce;
  const { railRef, onMouseMove, onMouseLeave } = useDock(magnify);

  return (
    <>
      {/* Desktop dock */}
      <aside
        ref={railRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="fixed inset-y-3 left-3 z-40 hidden w-[68px] flex-col items-center rounded-[28px] bg-ink py-4 md:flex"
      >
        {/* Ink rail — reversed mark (no ink outline; it would be invisible). */}
        <Link href={logoHref} aria-label={logoLabel} className="mb-4 shrink-0">
          <LogoMark size={44} tone="reversed" />
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-2">
          {items.map((it) => (
            <DockItem key={it.href} item={it} />
          ))}
        </nav>
        <DockLogout />
      </aside>

      {/* Mobile bottom bar — no magnification (no cursor to magnify toward). */}
      <nav
        className={cn(
          "fixed inset-x-3 bottom-3 z-40 flex items-center rounded-[24px] bg-ink px-2 py-2 shadow-soft md:hidden",
          mobileScrollable ? "gap-1 overflow-x-auto" : "justify-around",
        )}
      >
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                it.active ? "bg-sunny text-ink" : "text-white/55",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              {it.badge ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-flame ring-2 ring-ink" />
              ) : null}
            </Link>
          );
        })}
        {logoutInMobile && (
          <form action="/api/auth/logout" method="post" className="shrink-0">
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white/55"
            >
              <LogOut className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </form>
        )}
      </nav>
    </>
  );
}
