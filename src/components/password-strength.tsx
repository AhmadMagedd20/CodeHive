"use client";

import { scorePassword } from "@/lib/password-rules";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

/**
 * Live password strength indicator. Uses the same scorePassword() the server
 * validation is built on, so client and server never disagree.
 */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { score, label, checks, valid } = scorePassword(value);
  const barColors = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success-strong"];

  const req = (ok: boolean, text: string, required?: boolean) => (
    <li className={cn("flex items-center gap-1.5", ok ? "text-success-strong" : "text-muted-foreground")}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {text}
      {required && !ok ? <span className="text-destructive">*</span> : null}
    </li>
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < score ? barColors[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{label}</span>
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {req(checks.length, "8+ characters", true)}
        {req(checks.special, "Special character", true)}
        {req(checks.number, "Number (recommended)")}
        {req(checks.uppercase, "Uppercase (recommended)")}
      </ul>
      {!valid && (
        <p className="text-xs text-muted-foreground">* required before you can register</p>
      )}
    </div>
  );
}
