import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResendVerification } from "@/components/resend-verification";
import { OnboardingSteps } from "@/components/onboarding-steps";
import { consumeVerificationToken } from "@/lib/auth/verification";

export const metadata = { title: "Verify email" };

// Consuming the token is a state change, so render dynamically (no caching).
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  const result = token
    ? await consumeVerificationToken(token)
    : ({ ok: false, reason: "invalid" } as const);

  if (result.ok) {
    // A confirmed email is all it takes — the account is active and can sign in.
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <OnboardingSteps current={2} />
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-strong">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <CardTitle>You&apos;re in! 🎉</CardTitle>
          <CardDescription>
            {result.alreadyVerified
              ? "Your email is already confirmed — your account is ready."
              : "Your email is confirmed and your account is ready — no waiting."}{" "}
            Sign in and start learning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Sign in and start</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const expired = result.reason === "expired";
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
          <XCircle className="h-6 w-6" />
        </span>
        <CardTitle>{expired ? "Link expired" : "Invalid link"}</CardTitle>
        <CardDescription>
          {expired
            ? "This confirmation link has expired. Request a fresh one below."
            : "This confirmation link is invalid or has already been used. Request a new one below."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResendVerification />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
