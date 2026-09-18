"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "onDark" | "onDarkGhost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-flame text-white shadow-soft",
  secondary: "border-2 border-ink/15 bg-white text-ink hover:border-flame/40",
  onDark: "bg-white text-ink shadow-soft",
  onDarkGhost: "border-2 border-white/40 text-white hover:bg-white/10",
};

export function LandingButton({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: "lg" | "sm";
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex"
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      <Link
        href={href}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
          size === "lg" ? "h-12 px-7 text-base" : "h-10 px-5 text-sm",
          VARIANTS[variant],
          className,
        )}
      >
        {children}
      </Link>
    </motion.span>
  );
}
