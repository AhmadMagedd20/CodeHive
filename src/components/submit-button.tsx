"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that automatically shows a pending spinner and disables itself
 * while its parent <form> action is running. Used across all auth forms.
 */
export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? (pendingText ?? "Please wait…") : children}
    </Button>
  );
}
