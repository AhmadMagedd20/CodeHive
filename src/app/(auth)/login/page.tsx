import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: { reason?: string } }) {
  // Only redirect away if there's a genuinely active session. When arriving
  // with reason=elsewhere/expired the stale cookie resolves to "not active".
  const user = await getCurrentUser();
  if (user?.kind === "instructor") redirect("/admin");
  if (user?.kind === "student") redirect("/dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your Cohort Portal account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm reason={searchParams.reason} />
      </CardContent>
    </Card>
  );
}
