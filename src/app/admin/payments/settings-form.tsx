"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ImagePlus, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/** InstaPay payment settings — handle, instructions, optional QR (multipart). */
export function PaymentSettingsForm({
  handle,
  instructions,
  qrUrl,
}: {
  handle: string | null;
  instructions: string | null;
  qrUrl: string | null;
}) {
  const router = useRouter();
  const qrRef = useRef<HTMLInputElement>(null);
  const [qrName, setQrName] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const res = await fetch("/api/admin/instapay", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      setNotice("Payment settings saved.");
      setQrName(undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="instapayHandle">InstaPay handle / number</Label>
        <Input
          id="instapayHandle"
          name="instapayHandle"
          defaultValue={handle ?? ""}
          placeholder="megz@instapay  ·  01xxxxxxxxx"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="instapayInstructions">Instructions shown to students</Label>
        <Textarea
          id="instapayInstructions"
          name="instapayInstructions"
          rows={3}
          defaultValue={instructions ?? ""}
          placeholder="Send the exact course price to the handle above, then upload a screenshot of the transfer."
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {qrUrl && (
          <Image
            src={qrUrl}
            alt="Current InstaPay QR"
            width={80}
            height={80}
            unoptimized
            className="h-20 w-20 rounded-lg border-brutal border-ink object-cover"
          />
        )}
        <div>
          <input
            ref={qrRef}
            type="file"
            name="qr"
            accept="image/*"
            className="hidden"
            onChange={(e) => setQrName(e.target.files?.[0]?.name)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => qrRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> {qrUrl ? "Replace QR" : "Add QR code"}
          </Button>
          {qrName && <span className="ml-2 text-sm text-muted-foreground">{qrName}</span>}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-success-strong">{notice}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save payment settings
      </Button>
    </form>
  );
}
