import { CheckCircle2 } from "lucide-react";
import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RejectDialog } from "./reject-dialog";
import { approveStudentAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Pending registrations — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPendingPage() {
  const instructor = await requireInstructor();

  const pending = await prisma.student.findMany({
    where: { instructorId: instructor.id, state: "PENDING_ADMIN_APPROVAL" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Pending registrations</h1>
        <Badge variant={pending.length ? "warning" : "secondary"}>{pending.length}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Awaiting approval</CardTitle>
          <CardDescription>
            Students who confirmed their email and are waiting for you to approve access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-16 w-14 items-end justify-center rounded-arch bg-arch-fresh pb-2 shadow-glow">
                <CheckCircle2 className="h-6 w-6 text-cream" />
              </span>
              <p className="font-display font-semibold">All caught up</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                No registrations waiting for review.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.username}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.university}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <form action={approveStudentAction}>
                          <input type="hidden" name="studentId" value={s.id} />
                          <SubmitButton size="sm" pendingText="…">
                            Approve
                          </SubmitButton>
                        </form>
                        <RejectDialog studentId={s.id} username={s.username} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
