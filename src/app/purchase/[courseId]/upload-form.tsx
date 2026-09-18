"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Screenshot upload for a purchase. Camera-friendly on mobile. */
export function PurchaseUploadForm({
  courseId,
  moduleId,
}: {
  courseId: string;
  /** Set when buying a single week; omitted for a whole-course purchase. */
  moduleId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileName(f?.name);
    setPreview(f ? URL.createObjectURL(f) : undefined);
  }

  async function submit() {
    const f = fileRef.current?.files?.[0];
    if (!f) return setError("Choose a screenshot first.");
    setBusy(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      if (moduleId) fd.set("moduleId", moduleId);
      fd.set("screenshot", f);
      const res = await fetch("/api/purchase", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.pending) {
          router.push("/purchases");
          return;
        }
        throw new Error(data.error ?? "Upload failed");
      }
      router.push("/purchases?submitted=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Transfer screenshot preview"
          className="max-h-72 w-auto rounded-lg border-brutal border-ink"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> {fileName ? "Change screenshot" : "Upload screenshot"}
        </Button>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy || !fileName} className="w-full sm:w-auto">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Submit for review
      </Button>
    </div>
  );
}
