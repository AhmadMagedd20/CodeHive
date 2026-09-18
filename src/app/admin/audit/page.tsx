import { requireInstructor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Audit log — Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminAuditPage() {
  const instructor = await requireInstructor();

  // Scope the log to this instructor's students, plus login attempts that
  // never matched an account (studentId null) — those still matter for abuse
  // monitoring and don't leak cross-tenant data.
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [{ student: { instructorId: instructor.id } }, { studentId: null }],
    },
    include: { student: { select: { username: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-subsection">Audit log</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
          <CardDescription>
            Login attempts and account/security events (latest {PAGE_SIZE}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {l.createdAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {l.event.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.success ? "success" : "destructive"}>
                        {l.success ? "success" : "fail"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {l.student
                        ? l.student.username
                        : (l.emailAttempted ?? <span className="text-muted-foreground">—</span>)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.ip ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.message ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
