import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user?.kind === "student") redirect("/dashboard");
  if (user?.kind === "instructor") redirect("/admin");

  const siteKey = env.CAPTCHA_ENABLED ? env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Register to request access to your courses.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm turnstileSiteKey={siteKey} />
      </CardContent>
    </Card>
  );
}
