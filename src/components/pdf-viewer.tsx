"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, FileWarning } from "lucide-react";

/**
 * Locked in-browser PDF viewer. Pages are rendered to <canvas> (no text layer),
 * so text can't be selected/copied. Each page is overlaid with a repeating
 * watermark, and context-menu/print are blocked best-effort. Not download-proof
 * (nothing browser-side fully is), but raises the bar meaningfully.
 */
export function PdfViewer({ src, watermark }: { src: string; watermark: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument({ url: src }).promise;
        if (cancelled) return;

        const width = Math.min(container.clientWidth || 800, 900);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale });

          const wrap = document.createElement("div");
          wrap.className = "relative mx-auto mb-4 w-fit shadow-sm";

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "block rounded";
          const ctx = canvas.getContext("2d")!;
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Tiled diagonal watermark overlay.
          const wm = document.createElement("div");
          wm.className =
            "pointer-events-none absolute inset-0 flex flex-col justify-around overflow-hidden";
          for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.textContent = `${watermark}   ${watermark}`;
            line.className = "whitespace-nowrap text-center text-[13px] font-semibold text-black/10";
            line.style.transform = "rotate(-24deg)";
            wm.appendChild(line);
          }

          wrap.appendChild(canvas);
          wrap.appendChild(wm);
          container.appendChild(wrap);
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, watermark]);

  return (
    <div>
      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading document…
        </div>
      )}
      {state === "error" && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <FileWarning className="h-6 w-6" /> Couldn&apos;t load this document.
        </div>
      )}
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className="select-none print:hidden"
        style={{ userSelect: "none" }}
      />
    </div>
  );
}
