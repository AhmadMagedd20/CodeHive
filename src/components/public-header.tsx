import Link from "next/link";
import { Logo } from "@/components/logo";

/** Lightweight sticky header for public catalog / preview pages. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Cohort Portal home" className="shrink-0 leading-tight">
          <span className="hidden text-[11px] font-medium text-ink/45 sm:block">Welcome to</span>
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/catalog"
            className="hidden text-sm font-semibold text-ink/60 transition-colors hover:text-ink sm:block"
          >
            Browse courses
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-ink/60 transition-colors hover:text-ink"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full border-brutal border-ink bg-flame px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
