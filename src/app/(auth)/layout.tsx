import Link from "next/link";
import { BrandLogo } from "@/components/logo";

/**
 * Shell for all unauthenticated auth pages (login, register, verify, reset).
 * Field-journal treatment: grained paper, a soft arch rising behind the brand
 * (the logo's gate motif), and a staggered entrance.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="texture-grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-fog to-paper px-4 py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[560px] -translate-x-1/2 -translate-y-[45%] rounded-full bg-sage/20 blur-3xl"
      />
      <div className="stagger-children relative flex w-full flex-col items-center">
        <Link href="/" className="relative mb-8">
          <span
            aria-hidden
            className="absolute -inset-x-8 -top-6 bottom-0 -z-10 rounded-arch bg-cream/70 shadow-hairline"
          />
          <BrandLogo variant="stacked" priority className="h-24" />
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} The Cohort Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
