import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResendVerification } from "@/components/resend-verification";
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
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-strong">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <CardTitle>Email verified</CardTitle>
          <CardDescription>
            {result.alreadyVerified
              ? "Your email was already verified."
              : "Thanks — your email address is confirmed."}{" "}
            Your account is now awaiting instructor approval. We&apos;ll email you once it&apos;s
            reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Continue to sign in</Link>
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
