import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

/**
 * 404. Reached by `notFound()` (a lesson or course the student can't see, or a
 * stale link) as well as by genuinely bad URLs — so the copy avoids accusing
 * anyone of mistyping, and offers both an authenticated and a public way out.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-16 text-ink">
      <div className="w-full max-w-lg rounded-card border-brutal border-ink bg-white p-8 text-center shadow-soft sm:p-10">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-brutal border-ink bg-lilac">
          <Compass className="h-6 w-6 text-ink" />
        </span>

        <h1 className="font-display text-subsection">We can&apos;t find that page</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink/60">
          The link may be old, or the lesson may not be open to you yet. Your courses are all still
          where you left them.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-brutal border-ink bg-flame px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Back to my courses
          </Link>
          <Link
            href="/catalog"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-brutal border-ink bg-white px-6 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            Browse courses
          </Link>
        </div>
      </div>
    </main>
  );
}
