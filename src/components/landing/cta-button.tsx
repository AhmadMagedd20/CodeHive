"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "onDark" | "onDarkGhost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-bark text-cream hover:bg-bark-dark shadow-sm hover:shadow-[0_12px_34px_-10px_rgba(111,126,91,0.75)]",
  secondary: "border-2 border-bark/60 text-bark hover:bg-bark hover:text-cream",
  onDark:
    "bg-cream text-bark hover:bg-white shadow-sm hover:shadow-[0_12px_34px_-8px_rgba(159,174,140,0.85)]",
  onDarkGhost: "border-2 border-cream/40 text-cream hover:bg-cream/10",
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
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
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
