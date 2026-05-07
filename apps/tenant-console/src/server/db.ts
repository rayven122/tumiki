import { env } from "@/lib/env";
import { PrismaClient } from "@db-client";

const createPrismaClient = () =>
  new PrismaClient({
    datasources: { db: { url: env.TENANT_DATABASE_URL } },
  });

const globalForPrisma = globalThis as unknown as {
  tenantDb: PrismaClient | undefined;
};

export const db = globalForPrisma.tenantDb ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.tenantDb = db;
