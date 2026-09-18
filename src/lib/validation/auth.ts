import { z } from "zod";
import { PASSWORD_MIN_LENGTH, SPECIAL_CHAR_RE } from "../password-rules";

/**
 * Shared Zod schemas — imported by both client components (inline validation)
 * and server actions (authoritative validation). Kept free of server-only
 * imports so they're safe in the browser bundle.
 */

export const UNIVERSITIES = ["GUC", "GIU"] as const;
export type UniversityValue = (typeof UNIVERSITIES)[number];

const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((v) => SPECIAL_CHAR_RE.test(v), "Password must contain at least one special character");

const usernameField = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Use only letters, numbers, and . _ -");

const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");

export const registerSchema = z
  .object({
    username: usernameField,
    email: emailField,
    university: z.enum(UNIVERSITIES, { message: "Select your university" }),
    password: passwordField,
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "You must accept the Terms of Use and Privacy Policy"),
    // In-person branch: when checked, a registration code is required (its
    // validity is checked server-side against the instructor's roster).
    isInPerson: z.boolean().optional().default(false),
    studentCode: z.string().trim().optional().default(""),
    // Bot protection: honeypot must be empty; captcha token optional (checked server-side).
    website: z.string().max(0, "Bot detected").optional().default(""),
    captchaToken: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => !d.isInPerson || d.studentCode.length > 0, {
    message: "Enter the code Megz gave you",
    path: ["studentCode"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({
  email: emailField,
});
