import Link from "next/link";
import { UserPlus, Users, ArrowRight, Ban, RefreshCw, Trash2 } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { codeStatus, type CodeStatus } from "@/lib/roster";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StateBadge } from "@/components/state-badge";
import { SubmitButton } from "@/components/submit-button";
import { CopyCode } from "@/components/copy-code";
import {
  createRosterEntryAction,
  revokeCodeAction,
  regenerateCodeAction,
  deleteRosterEntryAction,
} from "./actions";

export const metadata = { title: "Roster — Admin" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<CodeStatus, { variant: "info" | "success" | "danger" | "warning"; label: string }> = {
  unused: { variant: "info", label: "Code unused" },
  used: { variant: "success", label: "Registered" },
  revoked: { variant: "danger", label: "Revoked" },
  expired: { variant: "warning", label: "Expired" },
};

export default async function RosterPage() {
  const instructor = await requireInstructor();

  const entries = await prisma.rosterEntry.findMany({
    where: { instructorId: instructor.id },
    include: { student: { select: { id: true, username: true, email: true, state: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky shadow-soft">
          <Users className="h-5 w-5 text-ink" />
        </span>
        <div>
          <h1 className="font-display text-subsection">In-person roster</h1>
          <p className="text-sm text-muted-foreground">
            Pre-register your in-person students and hand them a code. A valid code auto-approves
            their account.
          </p>
        </div>
      </div>

      {/* Add student / generate code */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Add a student</CardTitle>
          <CardDescription>Generates a unique, single-use registration code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createRosterEntryAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Student name</Label>
                <Input id="name" name="name" placeholder="e.g. Lina Amr" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" name="email" type="email" placeholder="to email them the code" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" name="notes" placeholder="section, group, anything" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDays">Code expires in (days, optional)</Label>
                <Input id="expiryDays" name="expiryDays" inputMode="numeric" placeholder="never" />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="emailCode" name="emailCode" className="mt-0.5" />
              <Label htmlFor="emailCode" className="text-sm font-normal leading-snug text-muted-foreground">
                Email the code to the student (needs an email above).
              </Label>
            </div>
            <SubmitButton pendingText="Generating…">
              <UserPlus className="h-4 w-4" /> Generate code
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* Roster list */}
      <h2 className="mb-3 font-display text-card-title">
        Roster <span className="text-muted-foreground">({entries.length})</span>
      </h2>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No in-person students yet. Add one above to generate their first code.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const status = codeStatus(e);
            const badge = STATUS_BADGE[status];
            const canManageCode = status !== "used";
            return (
              <Card key={e.id}>
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{e.name}</p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {e.student && <StateBadge state={e.student.state} />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.student
                        ? `Registered as ${e.student.username} · ${e.student.email}`
                        : e.email ?? "no email on file"}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  </div>

                  {canManageCode ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyCode code={e.code} />
                      <form action={regenerateCodeAction}>
                        <input type="hidden" name="entryId" value={e.id} />
                        <button
                          type="submit"
                          title="Regenerate code"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </form>
                      {status === "unused" && (
                        <form action={revokeCodeAction}>
                          <input type="hidden" name="entryId" value={e.id} />
                          <button
                            type="submit"
                            title="Revoke code"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger-strong"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                      <form action={deleteRosterEntryAction}>
                        <input type="hidden" name="entryId" value={e.id} />
                        <button
                          type="submit"
                          title="Delete roster entry"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger-strong"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    e.student && (
                      <Link
                        href={`/admin/roster/student/${e.student.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                      >
                        Access & attendance <ArrowRight className="h-4 w-4" />
                      </Link>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
