import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

import { env } from "@/env";

import { fieldEncryptionMiddleware } from "prisma-field-encryption";

// websocket を使った接続を使う
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

const createPrismaClient = () => {
  const client = new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  // HACK: fieldEncryptionExtension　が使えないため、fieldEncryptionMiddlewareを使う
  client.$use(fieldEncryptionMiddleware());
  // // フィールド暗号化のための拡張
  // client.$extends(fieldEncryptionExtension());
  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
