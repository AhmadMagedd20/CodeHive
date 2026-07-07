import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client so we can assert the single-session behaviour without
// a live database. vi.hoisted lets the factory reference these safely.
const m = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { deleteMany: m.deleteMany, create: m.create },
    $transaction: m.transaction,
  },
}));

// Avoid touching cookies (request-scoped) — we only test persistSession.
import { persistSession } from "@/lib/auth/session";

beforeEach(() => {
  m.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  m.create.mockReset().mockResolvedValue({ id: "sess1" });
  // Real Prisma runs the ops atomically; emulate by resolving them.
  m.transaction.mockReset().mockImplementation((ops: unknown[]) => Promise.all(ops));
});

describe("strict single session", () => {
  it("deletes any existing session for the account before creating a new one", async () => {
    const token = await persistSession({ kind: "student", id: "stu1" });

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    expect(m.deleteMany).toHaveBeenCalledTimes(1);
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { studentId: "stu1" } });
    expect(m.create).toHaveBeenCalledTimes(1);

    // Delete must be sequenced before create (old device invalidated first).
    const delOrder = m.deleteMany.mock.invocationCallOrder[0];
    const createOrder = m.create.mock.invocationCallOrder[0];
    expect(delOrder).toBeLessThan(createOrder);
  });

  it("stores only the token HASH, never the raw token", async () => {
    const token = await persistSession({ kind: "student", id: "stu1" });
    const createArg = m.create.mock.calls[0][0] as { data: { tokenHash: string } };
    expect(createArg.data.tokenHash).not.toEqual(token);
    expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  it("a second login for the same account triggers another invalidation", async () => {
    await persistSession({ kind: "student", id: "stu1" });
    await persistSession({ kind: "student", id: "stu1" });
    expect(m.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("scopes invalidation by instructorId for instructor sessions", async () => {
    await persistSession({ kind: "instructor", id: "ins1" });
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { instructorId: "ins1" } });
  });
});
