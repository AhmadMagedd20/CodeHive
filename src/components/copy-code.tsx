"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Monospace code chip with a click-to-copy button. */
export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
      className={`group inline-flex items-center gap-2 rounded-lg border-brutal border-ink bg-muted/40 px-2.5 py-1 font-mono text-sm font-medium tracking-wide text-ink transition-colors hover:border-flame/40 hover:bg-accent/40 ${className ?? ""}`}
      title="Copy code"
    >
      {code}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success-strong" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-flame" />
      )}
    </button>
  );
}
