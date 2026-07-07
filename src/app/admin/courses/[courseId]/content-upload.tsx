"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import type { LessonType } from "@prisma/client";
import { Button } from "@/components/ui/button";

const ACCEPT: Partial<Record<LessonType, string>> = {
  VIDEO: "video/*",
  DOCUMENT: "application/pdf,image/*,.zip,application/zip",
};

/** Uploads a video/document for a lesson item via /api/admin/content-upload. */
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.set("itemId", itemId);
      fd.set("file", file);
      const res = await fetch("/api/admin/content-upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const label = type === "VIDEO" ? "video" : "document";
  return (
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
        {hasContent ? `Replace ${label}` : `Upload ${label}`}
      </Button>
      {hasContent && !busy && (
        <span className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> {label} attached
        </span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
