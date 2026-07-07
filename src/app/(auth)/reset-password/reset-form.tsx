"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { resetPasswordAction } from "./actions";
import { initialFormState } from "@/lib/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { PasswordStrength } from "@/components/password-strength";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useFormState(resetPasswordAction, initialFormState);
  const [password, setPassword] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.message && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}{" "}
            {state.code === "TOKEN_INVALID" && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          required
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        <PasswordStrength value={password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          required
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      <SubmitButton className="w-full" pendingText="Updating…">
        Set new password
      </SubmitButton>
    </form>
  );
}
