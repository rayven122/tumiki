import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionMiddleware } from "prisma-field-encryption";
import ws from "ws";

const createPrismaClient = (): PrismaClient => {
  // websocket を使った接続を使う
  neonConfig.webSocketConstructor = ws;
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaNeon({ connectionString });

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
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

  const extendedClient = client.$extends({
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
  return extendedClient as unknown as PrismaClient;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = PrismaClient;
