import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";
import { OnboardingSteps } from "@/components/onboarding-steps";
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
        <OnboardingSteps current={0} />
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Takes under a minute — this form is the whole thing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm turnstileSiteKey={siteKey} />
      </CardContent>
    </Card>
  );
}
