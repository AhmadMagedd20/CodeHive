import { describe, it, expect } from "vitest";
import { AccountState } from "@prisma/client";
import { gateForState } from "@/lib/auth/account-state";

describe("login gating by account state", () => {
  it("allows only ACTIVE accounts to log in", () => {
    expect(gateForState(AccountState.ACTIVE).allowed).toBe(true);
    for (const s of [
      AccountState.PENDING_EMAIL_VERIFICATION,
      AccountState.PENDING_ADMIN_APPROVAL,
      AccountState.SUSPENDED,
      AccountState.REJECTED,
      AccountState.DEACTIVATED,
    ]) {
      expect(gateForState(s).allowed).toBe(false);
    }
  });

  it("gives each blocked state a distinct code and message", () => {
    const codes = [
      AccountState.PENDING_EMAIL_VERIFICATION,
      AccountState.PENDING_ADMIN_APPROVAL,
      AccountState.SUSPENDED,
      AccountState.REJECTED,
      AccountState.DEACTIVATED,
    ].map((s) => gateForState(s).code);
    expect(new Set(codes).size).toBe(codes.length); // all distinct
    for (const s of [AccountState.SUSPENDED, AccountState.REJECTED, AccountState.DEACTIVATED]) {
      expect(gateForState(s).message.length).toBeGreaterThan(0);
    }
  });

  it("offers resend only for unverified email", () => {
    expect(gateForState(AccountState.PENDING_EMAIL_VERIFICATION).canResendVerification).toBe(true);
    expect(gateForState(AccountState.PENDING_ADMIN_APPROVAL).canResendVerification).toBeFalsy();
  });

  it("includes the rejection reason when present", () => {
    const gate = gateForState(AccountState.REJECTED, "Not enrolled this term");
    expect(gate.message).toContain("Not enrolled this term");
  });

  it("uses a clear awaiting-approval message (not a generic error)", () => {
    expect(gateForState(AccountState.PENDING_ADMIN_APPROVAL).message.toLowerCase()).toContain(
      "approval",
    );
  });
});
