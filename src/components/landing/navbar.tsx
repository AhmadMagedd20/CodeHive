"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/logo";
import { LandingButton } from "./cta-button";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "What You Get", href: "#what-you-get" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About Megz", href: "#about" },
  { label: "Log In", href: "/login" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-fog/80 shadow-[0_1px_0_rgba(52,64,42,0.08)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Cohort Portal home" className="shrink-0">
          <BrandLogo variant="horizontal" color="moss" priority className="h-6 sm:h-7" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-bark/70 transition-colors hover:text-bark"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <LandingButton href="/register" size="sm">
            Get Started
          </LandingButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full text-bark hover:bg-sage/30 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-bark/10 bg-fog/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-bark/80 hover:bg-sage/25"
                >
                  {l.label}
                </Link>
              ))}
              <div className="pt-2">
                <LandingButton href="/register" size="sm" className="w-full">
                  Get Started
                </LandingButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
