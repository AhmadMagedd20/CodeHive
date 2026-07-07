import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with argon2id. Raw passwords are never stored or logged.
 * Using @node-rs/argon2 (prebuilt native binaries) for Node-23 compatibility.
 *
 * SERVER ONLY — importing this pulls in the native argon2 binary. For the
 * client-safe strength rules, import from "./password-rules" instead.
 */

// OWASP-recommended argon2id parameters (memory in KiB).
const ARGON2_OPTS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(hashValue: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashValue, plain);
  } catch {
    // Malformed hash etc. — treat as non-match rather than throwing.
    return false;
  }
}

// Re-export the client-safe rules for server-side convenience.
export {
  scorePassword,
  PASSWORD_MIN_LENGTH,
  SPECIAL_CHAR_RE,
  type PasswordStrength,
} from "./password-rules";
