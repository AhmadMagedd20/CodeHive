import { PrismaClient } from "@prisma/client";
import { isProd } from "./env";

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ["error"] : ["error", "warn"],
  });

if (!isProd) globalForPrisma.prisma = prisma;
