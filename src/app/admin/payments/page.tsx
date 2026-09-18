import Image from "next/image";
import { Wallet, CheckCircle2, ExternalLink } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { formatPrice } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentSettingsForm } from "./settings-form";
import { PurchaseActions } from "./purchase-actions";

export const metadata = { title: "Payments — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const instructor = await prisma.instructor.findUniqueOrThrow({
    where: { id: (await requireInstructor()).id },
    include: { instapayQr: true },
  });

  const pending = await prisma.purchase.findMany({
    where: { status: "PENDING", course: { instructorId: instructor.id } },
    include: {
      student: { select: { username: true, email: true } },
      course: { select: { title: true } },
      // Phase 5 — week-scoped purchases; orderIndex gives the "Week N" number.
      module: { select: { title: true, orderIndex: true } },
      screenshot: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const qrUrl = instructor.instapayQr ? await storage.getUrl(instructor.instapayQr.storageKey) : null;
  const shots = new Map<string, string>();
  for (const p of pending) {
    if (p.screenshot) shots.set(p.id, await storage.getUrl(p.screenshot.storageKey));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sunny shadow-soft">
          <Wallet className="h-5 w-5 text-ink" />
        </span>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-subsection">Payments</h1>
            <Badge variant={pending.length ? "warning" : "secondary"}>{pending.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review InstaPay transfers and grant course access.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment settings</CardTitle>
          <CardDescription>
            What buyers see on the payment screen. Editable anytime — details change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentSettingsForm
            handle={instructor.instapayHandle}
            instructions={instructor.instapayInstructions}
            qrUrl={qrUrl}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-display text-card-title">
          Pending payments <span className="text-muted-foreground">({pending.length})</span>
        </h2>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft">
                <CheckCircle2 className="h-5 w-5 text-success-strong" />
              </span>
              <p className="text-sm text-muted-foreground">No payments waiting for review.</p>
            </CardContent>
          </Card>
        ) : (
          pending.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {/* Scope is called out first so it's obvious WHAT is being approved. */}
                  {p.module ? (
                    <>
                      <Badge variant="warning">Week {p.module.orderIndex + 1}</Badge>
                      <span>
                        {p.course.title}{" "}
                        <span className="text-muted-foreground">— {p.module.title}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">Full course</Badge>
                      {p.course.title}
                    </>
                  )}
                  <Badge variant="info">Pending</Badge>
                  <span className="font-display text-base font-extrabold tracking-display text-ink">
                    {formatPrice(p.priceCents, p.currency)}
                  </span>
                  {/* Upgrade credit — makes a reduced course charge auditable. */}
                  {p.priorCreditCents ? (
                    <span className="text-xs font-medium text-mint-strong">
                      after −{formatPrice(p.priorCreditCents, p.currency)} already paid for weeks
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  {p.student.username} ({p.student.email}) ·{" "}
                  {p.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shots.has(p.id) ? (
                  <a
                    href={shots.get(p.id)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block w-fit overflow-hidden rounded-lg border-brutal border-ink"
                  >
                    <Image
                      src={shots.get(p.id)!}
                      alt="Payment screenshot"
                      width={640}
                      height={800}
                      unoptimized
                      className="max-h-80 w-auto object-contain"
                    />
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-ink/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink className="h-3 w-3" /> Full size
                    </span>
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No screenshot attached.</p>
                )}
                <PurchaseActions purchaseId={p.id} />
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
