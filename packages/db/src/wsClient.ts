import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { createBaseClient } from "./createBaseClient.js";

const createPrismaClient = () => {
  // websocket を使った接続を使う
  neonConfig.webSocketConstructor = ws;
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaNeon({ connectionString });

  return createBaseClient({ adapter, connectionString });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

export type { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = ReturnType<typeof createPrismaClient>;
