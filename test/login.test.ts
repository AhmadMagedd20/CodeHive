import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { hashPassword } from "@/lib/password";

const m = vi.hoisted(() => ({
  findFirst: vi.fn(),
  instructorFindUnique: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findFirst: m.findFirst, update: m.update },
    instructor: { findUnique: m.instructorFindUnique },
    auditLog: { create: m.auditCreate },
  },
}));

import { authenticate } from "@/lib/auth/login";

const PASSWORD = "Correct1!";
let passwordHash: string;

function student(overrides: Record<string, unknown> = {}) {
  return {
    id: "stu1",
    username: "alice",
    email: "alice@example.com",
    passwordHash,
    state: "ACTIVE",
    rejectionReason: null,
    failedLoginCount: 0,
    lockedUntil: null,
    requiresTwoFactor: false,
    ...overrides,
  };
}

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  m.findFirst.mockReset();
  m.instructorFindUnique.mockReset().mockResolvedValue(null);
  m.update.mockReset().mockResolvedValue({});
  m.auditCreate.mockReset().mockResolvedValue({});
});

describe("authenticate()", () => {
  it("returns 'invalid' for a wrong password and counts the failure", async () => {
    m.findFirst.mockResolvedValue(student());
    const res = await authenticate("alice@example.com", "wrong-password");
    expect(res.status).toBe("invalid");
    expect(m.update).toHaveBeenCalled(); // failure counter incremented
  });

  it("returns 'invalid' (no enumeration) for an unknown user", async () => {
    m.findFirst.mockResolvedValue(null);
    const res = await authenticate("ghost@example.com", "anything");
    expect(res.status).toBe("invalid");
    expect(m.update).not.toHaveBeenCalled();
  });

  it("logs in an ACTIVE student with the correct password", async () => {
    m.findFirst.mockResolvedValue(student());
    const res = await authenticate("alice@example.com", PASSWORD);
    expect(res.status).toBe("ok");
    if (res.status === "ok") expect(res.principal).toEqual({ kind: "student", id: "stu1" });
  });

  it("blocks a SUSPENDED student even with the correct password", async () => {
    m.findFirst.mockResolvedValue(student({ state: "SUSPENDED" }));
    const res = await authenticate("alice@example.com", PASSWORD);
    expect(res.status).toBe("state_blocked");
    if (res.status === "state_blocked") expect(res.gate.code).toBe("SUSPENDED");
  });

  it("blocks a student pending email verification", async () => {
    m.findFirst.mockResolvedValue(student({ state: "PENDING_EMAIL_VERIFICATION" }));
    const res = await authenticate("alice@example.com", PASSWORD);
    expect(res.status).toBe("state_blocked");
    if (res.status === "state_blocked") expect(res.gate.code).toBe("EMAIL_UNVERIFIED");
  });

  it("blocks a locked account before checking the password", async () => {
    m.findFirst.mockResolvedValue(
      student({ lockedUntil: new Date(Date.now() + 10 * 60_000) }),
    );
    const res = await authenticate("alice@example.com", PASSWORD);
    expect(res.status).toBe("locked");
  });
});
