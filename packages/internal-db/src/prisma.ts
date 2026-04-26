import { PrismaClient } from "../generated/client/index.js";

const createPrismaClient = () => new PrismaClient();

const globalForPrisma = globalThis as unknown as {
  internalDb: PrismaClient | undefined;
};

export const db = globalForPrisma.internalDb ?? createPrismaClient();

export type { PrismaClient };
export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

if (process.env.NODE_ENV !== "production") globalForPrisma.internalDb = db;
