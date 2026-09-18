"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, ImagePlus, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * The one marketing asset that plays in the landing hero. Upload-only settings
 * (video + optional poster) — no course, no gating, no protection. Mirrors the
 * lesson-video status pattern: uploading → processing → ready.
 */
export function HeroVideoForm({
  filename,
  status,
  hasPoster,
}: {
  filename: string | null;
  status: string | null;
  hasPoster: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const [videoName, setVideoName] = useState<string>();
  const [posterName, setPosterName] = useState<string>();
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  async function post(body: FormData, kind: "upload" | "remove") {
    setBusy(kind);
    setNotice(undefined);
    setError(undefined);
    try {
      const res = await fetch("/api/admin/hero-video", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      setNotice(
        data.removed
          ? "Hero video removed — the landing page shows the placeholder again."
          : "Hero video saved. It's live on the landing page.",
      );
      setVideoName(undefined);
      setPosterName(undefined);
      if (videoRef.current) videoRef.current.value = "";
      if (posterRef.current) posterRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(null);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void post(new FormData(e.currentTarget), "upload");
      }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        {status === "READY" ? (
          <Badge variant="success">
            <CheckCircle2 /> Ready
          </Badge>
        ) : status ? (
          <Badge variant="warning">{status.toLowerCase()}</Badge>
        ) : (
          <Badge variant="secondary">No video yet</Badge>
        )}
        {filename && <span className="text-sm text-muted-foreground">{filename}</span>}
        {hasPoster && <span className="text-xs text-muted-foreground">· poster set</span>}
      </div>

      {!status && (
        <p className="text-sm text-muted-foreground">
          Until you upload one, the hero shows its static preview mock — never a broken player.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={videoRef}
          type="file"
          name="video"
          accept="video/*"
          className="hidden"
          onChange={(e) => setVideoName(e.target.files?.[0]?.name)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => videoRef.current?.click()}>
          <Upload className="h-4 w-4" /> {status ? "Replace video" : "Choose video"}
        </Button>
        {videoName && <span className="text-sm text-muted-foreground">{videoName}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={posterRef}
          type="file"
          name="poster"
          accept="image/*"
          className="hidden"
          onChange={(e) => setPosterName(e.target.files?.[0]?.name)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => posterRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> {hasPoster ? "Replace poster" : "Add poster (optional)"}
        </Button>
        {posterName && <span className="text-sm text-muted-foreground">{posterName}</span>}
      </div>

      <p className="text-xs text-muted-foreground">
        Video up to 200 MB, poster up to 5 MB. This clip is public and unprotected by design — it
        gets none of the watermarking or download-blocking that course lessons do.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-success-strong">{notice}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy !== null}>
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy === "upload" ? "Uploading…" : "Save hero video"}
        </Button>
        {status && (
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => {
              const fd = new FormData();
              fd.set("remove", "1");
              void post(fd, "remove");
            }}
          >
            {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}
