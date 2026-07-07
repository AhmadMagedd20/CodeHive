import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, scorePassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes to an argon2id string, never the plaintext", async () => {
    const hash = await hashPassword("Sup3r$ecret!");
    expect(hash).not.toContain("Sup3r$ecret!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("Sup3r$ecret!");
    expect(await verifyPassword(hash, "Sup3r$ecret!")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Sup3r$ecret!");
    expect(await verifyPassword(hash, "wrong-password!")).toBe(false);
  });

  it("uses a random salt (same input -> different hashes)", async () => {
    const a = await hashPassword("same-input!");
    const b = await hashPassword("same-input!");
    expect(a).not.toEqual(b);
    expect(await verifyPassword(a, "same-input!")).toBe(true);
    expect(await verifyPassword(b, "same-input!")).toBe(true);
  });

  it("returns false (not throw) for a malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
  });
});

describe("password strength rules", () => {
  it("requires min length + a special char", () => {
    expect(scorePassword("short").valid).toBe(false); // too short, no special
    expect(scorePassword("longenough").valid).toBe(false); // no special char
    expect(scorePassword("longenough!").valid).toBe(true); // 8+ and special
  });

  it("scores higher with numbers and uppercase", () => {
    expect(scorePassword("password!").score).toBeLessThan(scorePassword("Passw0rd!").score);
  });
});
