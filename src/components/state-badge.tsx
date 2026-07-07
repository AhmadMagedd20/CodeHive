import type { AccountState } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const MAP: Record<
  AccountState,
  { variant: "success" | "warning" | "destructive" | "info"; label: string }
> = {
  ACTIVE: { variant: "success", label: "Active" },
  PENDING_EMAIL_VERIFICATION: { variant: "warning", label: "Email unverified" },
  PENDING_ADMIN_APPROVAL: { variant: "warning", label: "Awaiting approval" },
  SUSPENDED: { variant: "destructive", label: "Suspended" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  DEACTIVATED: { variant: "info", label: "Deactivated" },
};

export function StateBadge({ state }: { state: AccountState }) {
  const { variant, label } = MAP[state];
  return <Badge variant={variant}>{label}</Badge>;
}
