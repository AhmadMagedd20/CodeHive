"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { approvePurchaseAction, rejectPurchaseAction } from "./actions";

/** Approve (grants access) / reject-with-reason for one pending purchase. */
export function PurchaseActions({ purchaseId }: { purchaseId: string }) {
  const [rejecting, setRejecting] = useState(false);

  if (rejecting) {
    return (
      <form action={rejectPurchaseAction} className="w-full space-y-2 rounded-lg border bg-muted/30 p-3">
        <input type="hidden" name="purchaseId" value={purchaseId} />
        <Textarea
          name="reason"
          rows={2}
          placeholder="Optional reason (emailed to the student — e.g. 'screenshot unreadable' or 'amount doesn't match')"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
          <SubmitButton size="sm" variant="destructive" pendingText="…">
            Confirm reject
          </SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <form action={approvePurchaseAction}>
        <input type="hidden" name="purchaseId" value={purchaseId} />
        <SubmitButton size="sm" pendingText="…">
          <Check className="h-4 w-4" /> Approve &amp; grant access
        </SubmitButton>
      </form>
      <Button type="button" size="sm" variant="outline" onClick={() => setRejecting(true)}>
        Reject
      </Button>
    </div>
  );
}
