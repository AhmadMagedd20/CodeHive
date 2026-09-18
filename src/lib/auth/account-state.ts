import { AccountState } from "@prisma/client";

/**
 * Maps each account state to a DISTINCT login outcome. This is the single
 * source of truth for "what happens when this account tries to log in" — the
 * login flow must not branch on state anywhere else.
 */

export interface LoginGate {
  /** Whether login may proceed past the state check. */
  allowed: boolean;
  /** Machine-readable reason (used by the UI to render the right affordance). */
  code:
    | "OK"
    | "EMAIL_UNVERIFIED"
    | "AWAITING_APPROVAL"
    | "SUSPENDED"
    | "REJECTED"
    | "DEACTIVATED";
  /** User-facing message. Never generic; never a stack trace. */
  message: string;
  /** Whether the login screen should offer "resend verification email". */
  canResendVerification?: boolean;
}

export function gateForState(state: AccountState, rejectionReason?: string | null): LoginGate {
  switch (state) {
    case AccountState.ACTIVE:
      return { allowed: true, code: "OK", message: "" };

    case AccountState.PENDING_EMAIL_VERIFICATION:
      return {
        allowed: false,
        code: "EMAIL_UNVERIFIED",
        message:
          "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
        canResendVerification: true,
      };

    // DEPRECATED and unreachable: verification activates accounts directly.
    // Kept because the value still exists in the Postgres enum — removing an
    // enum value means recreating the type, which is a needless risk on a live
    // database. Any historical row in this state still gets a sane message.
    case AccountState.PENDING_ADMIN_APPROVAL:
      return {
        allowed: false,
        code: "AWAITING_APPROVAL",
        message:
          "Your account is awaiting instructor approval. You'll receive an email once it's been reviewed.",
      };

    case AccountState.SUSPENDED:
      return {
        allowed: false,
        code: "SUSPENDED",
        message:
          "Your account has been suspended. Please contact your instructor for more information.",
      };

    case AccountState.REJECTED:
      return {
        allowed: false,
        code: "REJECTED",
        message: rejectionReason
          ? `Your registration was not approved. Reason: ${rejectionReason}`
          : "Your registration was not approved. Please contact your instructor.",
      };

    case AccountState.DEACTIVATED:
      return {
        allowed: false,
        code: "DEACTIVATED",
        message: "This account has been deactivated. Please contact your instructor.",
      };

    default:
      // Exhaustiveness guard — a new state must be handled explicitly.
      return {
        allowed: false,
        code: "DEACTIVATED",
        message: "This account cannot sign in. Please contact your instructor.",
      };
  }
}
