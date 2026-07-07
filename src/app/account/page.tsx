import { requireStudent } from "@/lib/auth/current-user";
import { AppHeader } from "@/components/app-header";
import { StudentNav } from "@/components/student-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const student = await requireStudent();

  return (
    <div className="min-h-screen">
      <AppHeader
        email={student.email}
        role="Student"
        nav={<StudentNav studentId={student.id} active="account" />}
      />
      <main className="container max-w-2xl py-8">
        <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">Account settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="font-medium">{student.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{student.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">University</span>
              <span className="font-medium">{student.university}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="success">{student.state.replace(/_/g, " ")}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change password</CardTitle>
            <CardDescription>Update the password you use to sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
