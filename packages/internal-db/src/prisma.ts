import { PrismaClient } from "@tumiki/internal-db/client";

const createPrismaClient = (): PrismaClient => new PrismaClient();

const globalForPrisma = globalThis as unknown as {
  internalDb: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.internalDb ?? createPrismaClient();

export type { PrismaClient };
export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

if (process.env.NODE_ENV !== "production") globalForPrisma.internalDb = db;
