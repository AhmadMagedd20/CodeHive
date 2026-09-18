"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft } from "lucide-react";

/**
 * Route-level error boundary. Catches anything thrown while rendering a page
 * or server component below it.
 *
 * The purchase and lesson routes are the ones that matter: a student who has
 * just sent an InstaPay transfer must never hit a dead end. So this always
 * offers both a retry (most failures here are transient — a cold database
 * connection, a provider hiccup) and a way back into the app.
 *
 * Next.js does not leak stack traces in production; the digest is the only
 * handle, and it's shown so a student can quote it in a message.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the Vercel function logs, where it can actually be found.
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-16 text-ink">
      <div className="w-full max-w-lg rounded-card border-brutal border-ink bg-white p-8 text-center shadow-soft sm:p-10">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-brutal border-ink bg-sunny">
          <RotateCcw className="h-6 w-6 text-ink" />
        </span>

        <h1 className="font-display text-subsection">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink/60">
          That page didn&apos;t load. It&apos;s usually temporary — try again, and if it keeps
          happening, message Megz and mention the code below.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-brutal border-ink bg-flame px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-brutal border-ink bg-white px-6 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Back to my courses
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-ink/40">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
