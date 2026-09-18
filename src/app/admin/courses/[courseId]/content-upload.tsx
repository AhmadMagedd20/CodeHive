"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import type { LessonType } from "@prisma/client";
import { Button } from "@/components/ui/button";

const ACCEPT: Partial<Record<LessonType, string>> = {
  VIDEO: "video/*",
  DOCUMENT: "application/pdf,image/*,.zip,application/zip",
};

type Phase =
  | { k: "idle" }
  | { k: "preparing" }
  | { k: "uploading"; pct: number }
  | { k: "processing"; pct: number | null }
  | { k: "ready" }
  | { k: "failed"; msg: string };

/**
 * Lesson content upload.
 *
 * Documents go through the server as before — they're small. **Video does not.**
 * A ~2h lecture is streamed from the browser straight to the video provider over
 * TUS (resumable), because routing those bytes through a serverless function
 * would blow both the wall-clock limit and the memory ceiling. The server only
 * mints a scoped ticket and records the result. See `lib/video/bunny.ts`.
 *
 * If the active provider has no direct upload (i.e. `local`, in development),
 * this transparently falls back to the old server-side route.
 */
export function ContentUpload({
  itemId,
  type,
  hasContent,
}: {
  itemId: string;
  type: LessonType;
  hasContent: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => clearInterval(pollRef.current), []);

  /** Watch the provider transcode until it's playable (or fails). */
  const pollStatus = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/video/status?itemId=${encodeURIComponent(itemId)}`);
        const j = (await res.json()) as { status?: string; progress?: number | null };
        if (j.status === "READY") {
          clearInterval(pollRef.current);
          setPhase({ k: "ready" });
          router.refresh();
        } else if (j.status === "ERROR") {
          clearInterval(pollRef.current);
          setPhase({ k: "failed", msg: "The provider could not process this file. Try re-uploading." });
        } else if (j.status === "PENDING") {
          clearInterval(pollRef.current);
          setPhase({ k: "failed", msg: "Upload never finished. Try again." });
        } else {
          setPhase({ k: "processing", pct: j.progress ?? null });
        }
      } catch {
        /* transient — keep polling */
      }
    }, 4000);
  }, [itemId, router]);

  /** The old path: the server receives the bytes. Documents, and dev video. */
  async function uploadViaServer(file: File) {
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("file", file);
    const res = await fetch("/api/admin/content-upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `Upload failed (${res.status})`);
    }
    setPhase({ k: "ready" });
    router.refresh();
  }

  async function uploadVideo(file: File) {
    setPhase({ k: "preparing" });

    const ticketRes = await fetch("/api/admin/video/direct-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, filename: file.name, contentType: file.type }),
    });

    // Provider has no direct upload (local dev) — use the server route.
    if (ticketRes.status === 400) return uploadViaServer(file);
    if (!ticketRes.ok) {
      const j = await ticketRes.json().catch(() => ({}));
      throw new Error(j.error ?? `Could not start upload (${ticketRes.status})`);
    }
    const ticket = (await ticketRes.json()) as {
      endpoint: string;
      headers: Record<string, string>;
      metadata: Record<string, string>;
    };

    const report = (ok: boolean, durationSeconds?: number) =>
      fetch("/api/admin/video/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, ok, durationSeconds }),
      }).catch(() => {});

    // Loaded on demand so the TUS client isn't in the main admin bundle.
    const tus = await import("tus-js-client");

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: ticket.endpoint,
        // A dropped connection on a multi-GB file must resume, not restart.
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: ticket.headers,
        metadata: ticket.metadata,
        removeFingerprintOnSuccess: true,
        onProgress(sent, total) {
          setPhase({ k: "uploading", pct: total ? Math.round((sent / total) * 100) : 0 });
        },
        async onSuccess() {
          await report(true);
          setPhase({ k: "processing", pct: null });
          pollStatus();
          resolve();
        },
        async onError(err) {
          await report(false);
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      });

      // Resume a previous attempt at this exact file if there is one.
      upload.findPreviousUploads().then((prev) => {
        if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
      });
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (type === "VIDEO") await uploadVideo(file);
      else {
        setPhase({ k: "uploading", pct: 0 });
        await uploadViaServer(file);
      }
    } catch (err) {
      setPhase({ k: "failed", msg: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const label = type === "VIDEO" ? "video" : "document";
  const busy = phase.k === "preparing" || phase.k === "uploading" || phase.k === "processing";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[type]}
          onChange={onFile}
          className="hidden"
          id={`upload-${itemId}`}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {phase.k === "failed" ? (
            <>
              <RotateCcw className="h-4 w-4" /> Retry {label}
            </>
          ) : hasContent ? (
            `Replace ${label}`
          ) : (
            `Upload ${label}`
          )}
        </Button>

        {hasContent && phase.k === "idle" && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {label} attached
          </span>
        )}
        {phase.k === "preparing" && <span className="text-xs text-ink/60">Preparing upload…</span>}
        {phase.k === "processing" && (
          <span className="text-xs text-ink/60">
            Processing{phase.pct != null ? ` — ${phase.pct}%` : ""}… you can leave this page.
          </span>
        )}
        {phase.k === "ready" && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> ready
          </span>
        )}
        {phase.k === "failed" && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> {phase.msg}
          </span>
        )}
      </div>

      {/* Real percentage, not a spinner that sits there for twenty minutes. */}
      {phase.k === "uploading" && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-56 overflow-hidden rounded-full border-brutal border-ink bg-white">
            <div
              className="h-full rounded-full bg-flame transition-all"
              style={{ width: `${phase.pct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-ink/60">{phase.pct}%</span>
        </div>
      )}
    </div>
  );
}
