"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { loginAction } from "./actions";
import { initialFormState } from "@/lib/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { ResendVerification } from "@/components/resend-verification";

const REASON_MESSAGES: Record<string, string> = {
  elsewhere: "You've been logged out because your account was signed in elsewhere.",
  expired: "Your session expired due to inactivity. Please sign in again.",
  loggedout: "You've been signed out.",
  "password-changed": "Your password was changed. Please sign in again.",
};

export function LoginForm({ reason }: { reason?: string }) {
  const [state, action] = useFormState(loginAction, initialFormState);
  const notice = reason ? REASON_MESSAGES[reason] : undefined;

  return (
    <div className="space-y-4">
      {notice && !state.message && (
        <Alert variant={reason === "elsewhere" ? "warning" : "info"}>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <form action={action} className="space-y-4">
        {state.message && !state.ok && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email or username</Label>
          <Input id="identifier" name="identifier" autoComplete="username" required autoFocus />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        <SubmitButton className="w-full" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      {/* When login is blocked because email isn't verified, offer a resend. */}
      {state.code === "EMAIL_UNVERIFIED" && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">Need a new confirmation link?</p>
          <ResendVerification />
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
