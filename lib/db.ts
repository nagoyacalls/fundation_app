import { PrismaClient } from "@prisma/client";

// Singleton: o hot reload do dev recriaria clientes e esgotaria conexões.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
