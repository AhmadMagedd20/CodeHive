"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Renderer for Markdown `pre` blocks: keeps the highlighted content and adds a
 * copy button. The copy button is intentional — teaching code should be
 * reusable (unlike protected video/PDF content).
 */
export function Pre({
  node: _node,
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLPreElement> & { node?: unknown }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white/80 opacity-0 transition-opacity hover:bg-white/20 focus:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={ref} className={className} {...rest}>
        {children}
      </pre>
    </div>
  );
}
