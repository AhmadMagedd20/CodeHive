import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendVerification } from "@/components/resend-verification";

export const metadata = { title: "Check your email" };

export default function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email ?? "";
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-strong">
          <MailCheck className="h-6 w-6" />
        </span>
        <CardTitle>Confirm your email</CardTitle>
        <CardDescription>
          We&apos;ve sent a confirmation link{email ? ` to ${email}` : ""}. Click it to verify your
          address. After verification, an instructor will review your account before you can sign in.
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
  );
}
