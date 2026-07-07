"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + slide up when the element scrolls into view (once). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its <StaggerItem> children into view. */
export function Stagger({
  children,
  className,
  stagger = 0.12,
  delayChildren = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

export type HeadingSegment = { text?: string; gradient?: boolean; br?: boolean };

/**
 * Heading that reveals word-by-word (fade + upward slide, staggered). Segments
 * let a phrase be marked `gradient` (brand shimmer) or `br` (line break).
 */
export function WordsHeading({
  segments,
  className,
  as: Tag = "h1",
}: {
  segments: HeadingSegment[];
  className?: string;
  as?: ElementType;
}) {
  const reduce = useReducedMotion();
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const word: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: "0.6em" },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <Tag className={className}>
      <motion.span
        className="inline"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {segments.map((seg, si) => {
          if (seg.br) return <br key={`br-${si}`} />;
          const words = (seg.text ?? "").split(" ").filter(Boolean);
          return words.map((w, wi) => (
            <span key={`${si}-${wi}`} className="inline-block whitespace-nowrap">
              <motion.span
                variants={word}
                className={cn("inline-block", seg.gradient && "text-gradient animate-shimmer")}
              >
                {w}
              </motion.span>
              {" "}
            </span>
          ));
        })}
      </motion.span>
    </Tag>
  );
}
