import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { createBaseClient } from "./createBaseClient.js";

const createPrismaClient = () => {
  const connectionString = `${process.env.DATABASE_URL}`;

  // Neon Databaseの場合のみWebSocketアダプターを使用
  // ローカルPostgreSQLの場合は標準のPrismaClientを使用
  if (connectionString.includes("neon.tech")) {
    // websocket を使った接続を使う
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString });
    return createBaseClient({ adapter, connectionString });
  }

  // ローカルPostgreSQLの場合は標準のPrismaClient
  return createBaseClient();
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

export type { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = ReturnType<typeof createPrismaClient>;
