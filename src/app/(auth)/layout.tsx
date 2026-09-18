import Link from "next/link";
import { Logo } from "@/components/logo";

/** Shell for all unauthenticated auth pages (login, register, verify, reset). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-10 text-ink">
      {/* soft colour blobs for a friendly canvas */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-sunny/40 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-lilac/40 blur-3xl"
      />
      <div className="relative flex w-full flex-col items-center">
        <Link href="/" aria-label="Cohort Portal home" className="mb-8 text-center leading-tight">
          <span className="mb-1.5 block text-xs font-medium text-ink/45">Welcome to</span>
          <Logo size="lg" />
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-xs text-ink/45">
          © {new Date().getFullYear()} The Cohort Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
