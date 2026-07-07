"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * Composer for a new announcement — course or global, optional image, optional
 * scheduled send. Posts multipart to /api/admin/announcement.
 */
export function AnnouncementForm({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [scope, setScope] = useState<"COURSE" | "GLOBAL">("COURSE");
  const [imageName, setImageName] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/admin/announcement", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't post announcement");
      setNotice(
        data.scheduled
          ? "Scheduled — it'll be sent automatically at the chosen time."
          : `Posted and emailed to ${data.notified} student${data.notified === 1 ? "" : "s"}.`,
      );
      formRef.current?.reset();
      setImageName(undefined);
      setScope("COURSE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post announcement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="scope">Audience</Label>
          <Select
            id="scope"
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as "COURSE" | "GLOBAL")}
          >
            <option value="COURSE">A specific course</option>
            <option value="GLOBAL">Everyone (all cohorts)</option>
          </Select>
        </div>
        {scope === "COURSE" && (
          <div className="space-y-1.5">
            <Label htmlFor="courseId">Course</Label>
            <Select id="courseId" name="courseId" defaultValue="" required>
              <option value="" disabled>
                Choose a course…
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Lab 3 walkthrough is up" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          placeholder="Use **bold** and [links](https://…). One image can be attached below."
          required
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={imageRef}
          type="file"
          name="image"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImageName(e.target.files?.[0]?.name)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> {imageName ? "Change image" : "Attach image"}
        </Button>
        {imageName && <span className="text-sm text-muted-foreground">{imageName}</span>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="publishAt">Schedule (optional)</Label>
        <Input id="publishAt" name="publishAt" type="datetime-local" className="w-64 max-w-full" />
        <p className="text-xs text-muted-foreground">
          Leave blank to send now. Scheduled announcements go out automatically.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-success-strong">{notice}</p>}

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Post announcement
      </Button>
    </form>
  );
}
