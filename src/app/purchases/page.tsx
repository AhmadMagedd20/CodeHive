import Link from "next/link";
import { Wallet, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireStudent } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "My purchases" };
export const dynamic = "force-dynamic";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: { submitted?: string };
}) {
  const student = await requireStudent();

  const purchases = await prisma.purchase.findMany({
    where: { studentId: student.id },
    include: {
      course: { select: { id: true, title: true } },
      module: { select: { title: true, orderIndex: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell student={student} active="purchases">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sunny">
            <Wallet className="h-5 w-5 text-ink" />
          </span>
          <div>
            <h1 className="font-display text-subsection">My purchases</h1>
            <p className="text-sm text-ink/55">Your course purchases and their status.</p>
          </div>
        </div>

        {searchParams.submitted && (
          <div className="mb-5 rounded-2xl border border-lilac/40 bg-lilac-soft px-4 py-3 text-sm text-lilac-strong">
            Payment received — it&apos;s under review. We&apos;ll email you the moment it&apos;s
            approved, usually within a day.
          </div>
        )}

        {purchases.length === 0 ? (
          <div className="rounded-card border-brutal border-ink bg-white p-12 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lilac">
              <Wallet className="h-6 w-6 text-ink" />
            </span>
            <p className="font-display text-lg font-extrabold tracking-display">No purchases yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink/55">
              Browse the{" "}
              <Link href="/catalog" className="font-semibold text-flame hover:underline">
                course catalog
              </Link>{" "}
              to buy a course.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-card border-brutal border-ink bg-white p-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.course.title}</p>
                  {p.module && (
                    <p className="text-xs font-medium text-ink/55">
                      Week {p.module.orderIndex + 1} — {p.module.title}
                    </p>
                  )}
                  <p className="text-sm text-ink/55">
                    {formatPrice(p.priceCents, p.currency)} ·{" "}
                    {p.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                  {p.status === "REJECTED" && p.rejectionReason && (
                    <p className="mt-1.5 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong">
                      <span className="font-semibold">Reason:</span> {p.rejectionReason}
                    </p>
                  )}
                </div>

                {p.status === "PENDING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac px-3 py-1 text-xs font-semibold text-ink">
                    <Clock className="h-3.5 w-3.5" /> Under review
                  </span>
                )}
                {p.status === "APPROVED" && (
                  <Link
                    href={`/courses/${p.course.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-flame px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Open
                  </Link>
                )}
                {p.status === "REJECTED" && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger-strong">
                      <XCircle className="h-3.5 w-3.5" /> Not confirmed
                    </span>
                    <Link
                      href={`/purchase/${p.course.id}`}
                      className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                    >
                      Re-upload proof
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
