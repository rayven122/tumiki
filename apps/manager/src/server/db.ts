import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

import { env } from "apps/manager/src/env";

import { fieldEncryptionMiddleware } from "prisma-field-encryption";

const createPrismaClient = () => {
  // websocket を使った接続を使う
  neonConfig.webSocketConstructor = ws;
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaNeon({ connectionString });

  const client = new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],

    omit: {
      userMcpServerConfig: {
        envVars: true,
      },
    },
  });

  // HACK: fieldEncryptionExtension　が使えないため、fieldEncryptionMiddlewareを使う
  client.$use(fieldEncryptionMiddleware());
  // // フィールド暗号化のための拡張
  // client.$extends(fieldEncryptionExtension());

  client.$extends({
    query: {
      // userMcpServer: {
      //   findMany: async ({ args, query }) => {
      //     const result = await query(args);
      //     let parsedEnvVars: Record<string, string> | undefined;
      //     if (result.env)
      //       return result.map((item) => ({
      //         ...item,
      //         envVars: item.envVars && JSON.parse(item.envVars),
      //       }));
      //   },
      // },
    },
  });
  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = typeof db;
