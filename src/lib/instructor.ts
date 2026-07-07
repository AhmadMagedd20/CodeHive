import { prisma } from "./prisma";

/**
 * Multi-tenancy seam. New student registrations must be attached to an
 * instructor. Today there is a single instructor row, but NOTHING hardcodes
 * "there is exactly one admin": we always resolve the owning instructor by
 * querying. When multi-instructor onboarding arrives, this is the one place to
 * change (e.g. resolve by university, invite code, or subdomain).
 */
export async function getDefaultInstructorId(): Promise<string> {
  const instructor = await prisma.instructor.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!instructor) {
    throw new Error(
      "No instructor exists. Run `pnpm db:seed` to create the initial instructor account.",
    );
  }
  return instructor.id;
}
