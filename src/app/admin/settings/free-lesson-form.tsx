"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setFreeLesson } from "./actions";

/**
 * Paste-a-link form for the public free lesson. Mirrors the lesson builder's
 * YouTube form rather than the hero video's uploader: nothing is uploaded, so
 * there is no progress, no status polling and nothing to go wrong halfway.
 */
export function FreeLessonForm({
  videoId,
  title,
  blurb,
}: {
  videoId: string | null;
  title: string | null;
  blurb: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  async function save(formData: FormData) {
    setBusy(true);
    setMsg(undefined);
    try {
      const res = await setFreeLesson(formData);
      if (res?.error) {
        setMsg({ ok: false, text: res.error });
      } else {
        setMsg({
          ok: true,
          text: res?.cleared
            ? "Free lesson removed — the page now points visitors at the catalog."
            : "Saved. It's live at /free-lesson.",
        });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Could not save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={save} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="free-lesson-url">YouTube link</Label>
        <Input
          id="free-lesson-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.youtube.com/watch?v=..."
          defaultValue={videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""}
        />
        <p className="text-xs text-muted-foreground">
          Upload to your channel as <strong>Unlisted</strong>, then paste the link here. Leave
          this empty to take the free lesson down.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="free-lesson-title">Title (optional)</Label>
        <Input
          id="free-lesson-title"
          name="title"
          type="text"
          placeholder="e.g. Big-O, properly explained"
          defaultValue={title ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="free-lesson-blurb">Short description (optional)</Label>
        <Textarea
          id="free-lesson-blurb"
          name="blurb"
          rows={3}
          placeholder="One or two lines about what they'll learn."
          defaultValue={blurb ?? ""}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : "Save"}
        </Button>

        {videoId && (
          <Link
            href="/free-lesson"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-flame underline-offset-4 hover:underline"
          >
            View the page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {msg && (
        <p
          className={`flex items-center gap-1.5 text-sm ${
            msg.ok ? "text-mint-strong" : "text-destructive"
          }`}
        >
          {msg.ok ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {msg.text}
        </p>
      )}
    </form>
  );
}
