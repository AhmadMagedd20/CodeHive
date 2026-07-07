"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { changePasswordAction } from "./actions";
import { initialFormState } from "@/lib/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { PasswordStrength } from "@/components/password-strength";

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePasswordAction, initialFormState);
  const [password, setPassword] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.message && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          required
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive">{errors.currentPassword}</p>
        )}
      </div>

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

      <p className="text-xs text-muted-foreground">
        Changing your password signs you out of all devices.
      </p>
      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}
