"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { registerAction } from "./actions";
import { initialFormState } from "@/lib/form";
import { UNIVERSITIES } from "@/lib/validation/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { PasswordStrength } from "@/components/password-strength";
import { Turnstile } from "@/components/turnstile";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function RegisterForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [state, action] = useFormState(registerAction, initialFormState);
  const [password, setPassword] = useState("");
  const [inPerson, setInPerson] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.message && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" aria-invalid={!!errors.username} required />
        <FieldError msg={errors.username} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} required />
        <FieldError msg={errors.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="university">University</Label>
        <Select id="university" name="university" defaultValue="" aria-invalid={!!errors.university} required>
          <option value="" disabled>
            Select your university
          </option>
          {UNIVERSITIES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
        <FieldError msg={errors.university} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
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
        <FieldError msg={errors.password} />
        <PasswordStrength value={password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          required
        />
        <FieldError msg={errors.confirmPassword} />
      </div>

      {/* In-person branch: reveals the roster code field. */}
      <div className="rounded-lg border-brutal border-ink bg-muted/30 p-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="isInPerson"
            name="isInPerson"
            className="mt-0.5"
            checked={inPerson}
            onCheckedChange={(v) => setInPerson(v === true)}
          />
          <Label htmlFor="isInPerson" className="text-sm font-normal leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">
              I&apos;m taking classes with Megz in person
            </span>{" "}
            — enter the code Megz gave you to link your account and get your in-person rate.
          </Label>
        </div>
        {inPerson && (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="studentCode">Your registration code</Label>
            <Input
              id="studentCode"
              name="studentCode"
              placeholder="MEGZ-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono uppercase tracking-wide"
              aria-invalid={!!errors.studentCode}
            />
            <FieldError msg={errors.studentCode} />
          </div>
        )}
      </div>

      {/* Honeypot: hidden from humans, tempting to bots. Must stay empty. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Turnstile siteKey={turnstileSiteKey} />

      <div className="flex items-start gap-2">
        <Checkbox id="acceptTerms" name="acceptTerms" className="mt-0.5" />
        <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug text-muted-foreground">
          I agree to the{" "}
          <Link href="/terms" className="underline hover:text-foreground" target="_blank">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground" target="_blank">
            Privacy Policy
          </Link>
          .
        </Label>
      </div>
      <FieldError msg={errors.acceptTerms} />

      <SubmitButton className="w-full" pendingText="Creating your account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
