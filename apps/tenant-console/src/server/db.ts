import { PrismaClient } from "../../prisma/generated/client/index.js";

const createPrismaClient = () => new PrismaClient();

const globalForPrisma = globalThis as unknown as {
  tenantDb: PrismaClient | undefined;
};

export const db = globalForPrisma.tenantDb ?? createPrismaClient();

export type { PrismaClient };
export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

if (process.env.NODE_ENV !== "production") globalForPrisma.tenantDb = db;
