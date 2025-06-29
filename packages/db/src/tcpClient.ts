import { PrismaClient } from "@prisma/client";

import { fieldEncryptionMiddleware } from "./server.js";

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // フィールド暗号化のミドルウェアを追加
  client.$use(fieldEncryptionMiddleware());

  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
