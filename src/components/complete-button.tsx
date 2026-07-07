"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompleteButton({
  lessonItemId,
  initialCompleted,
}: {
  lessonItemId: string;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);

  async function mark() {
    if (done) return;
    setBusy(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonItemId, completed: true }),
    }).catch(() => {});
    setBusy(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <span className="inline-flex animate-pop items-center gap-1.5 rounded-full border border-success-strong/20 bg-success-soft px-4 py-2 text-sm font-semibold text-success-strong">
        <CheckCircle2 className="h-4 w-4" /> Completed
      </span>
    );
  }

  return (
    <Button onClick={mark} disabled={busy} size="sm">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
      Mark as complete
    </Button>
  );
}
