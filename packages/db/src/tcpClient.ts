import type { PrismaClient } from "@prisma/client";

import { createBaseClient } from "./createBaseClient.js";

const createPrismaClient = () => {
  return createBaseClient();
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

export type { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
