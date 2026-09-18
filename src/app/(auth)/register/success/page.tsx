import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendVerification } from "@/components/resend-verification";
import { OnboardingSteps, WhileYouWait } from "@/components/onboarding-steps";

export const metadata = { title: "Check your email" };

export default function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email ?? "";
  return (
    <>
      <Card>
        <CardHeader className="items-center text-center">
          <OnboardingSteps current={1} />
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-strong">
            <MailCheck className="h-6 w-6" />
          </span>
          <CardTitle>One click left — check your inbox</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link{email ? ` to ${email}` : ""}. Click it to confirm
            your email and you&apos;re in — no waiting, no approval step. Then just sign in and
            start.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or resend below.
          </p>
          <ResendVerification defaultEmail={email} />
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      <WhileYouWait />
    </>
  );
}
