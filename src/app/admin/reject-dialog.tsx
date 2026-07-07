"use client";

import { useState } from "react";
import { rejectStudentAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

/**
 * Inline reject control: reveals an optional-reason textarea, then submits.
 * Kept lightweight (no modal lib) — the reason is emailed to the student.
 */
export function RejectDialog({ studentId, username }: { studentId: string; username: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Reject
      </Button>
    );
  }

  return (
    <form
      action={rejectStudentAction}
      className="w-72 rounded-lg border bg-background p-3 text-left shadow-md"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <p className="mb-2 text-sm font-medium">Reject {username}?</p>
      <Textarea
        name="reason"
        rows={3}
        placeholder="Optional reason (emailed to the student)"
        className="mb-2 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <SubmitButton size="sm" variant="destructive" pendingText="…">
          Confirm reject
        </SubmitButton>
      </div>
    </form>
  );
}
