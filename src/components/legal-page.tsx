import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

/**
 * Shared shell for the Terms and Privacy pages: the review banner, the heading
 * with its "last updated" line, and a way back. Keeps both documents visually
 * identical and stops the banner drifting out of one of them.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper px-4 py-14 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cohort Portal
        </Link>

        <div className="mb-10 flex gap-3 rounded-card border-brutal border-ink bg-sunny p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
          <p className="text-sm leading-relaxed text-ink">
            <strong className="font-semibold">Draft — needs review before taking payments.</strong>{" "}
            This was written to describe what Cohort Portal actually does, not as legal advice, and
            it has not been checked by a lawyer. Have someone qualified in your jurisdiction review
            it before you accept real money, and fill in every section marked{" "}
            <span className="font-mono text-[0.85em]">[TO CONFIRM]</span>.
          </p>
        </div>

        <h1 className="font-display text-section">{title}</h1>
        <p className="mt-3 text-sm text-ink/50">Last updated: {updated}</p>

        <div className="legal mt-10 space-y-8">{children}</div>
      </div>
    </main>
  );
}

/** One numbered section. */
export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-card-title">
        {n}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/75">{children}</div>
    </section>
  );
}

/** Something the operator must supply before publishing. */
export function Todo({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-lilac-soft px-1.5 py-0.5 font-mono text-[0.85em] text-lilac-strong">
      [TO CONFIRM] {children}
    </span>
  );
}
