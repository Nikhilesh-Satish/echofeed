import { PrismaClient } from "../generated/prisma"; // <- this points to the generated client

declare global {
  // Prevent multiple instances in development
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
