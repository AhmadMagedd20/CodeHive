"use client";

import { useFormState } from "react-dom";
import { resendVerificationAction } from "@/app/(auth)/actions";
import { initialFormState } from "@/lib/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

/** Reusable "resend confirmation email" form (success page + login page). */
export function ResendVerification({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action] = useFormState(resendVerificationAction, initialFormState);
  return (
    <form action={action} className="space-y-3">
      {state.message && (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="resend-email">Email</Label>
        <Input
          id="resend-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
        />
      </div>
      <SubmitButton variant="outline" className="w-full" pendingText="Sending…">
        Resend confirmation email
      </SubmitButton>
    </form>
  );
}
