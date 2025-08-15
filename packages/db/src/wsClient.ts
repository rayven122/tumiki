import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

import { runWithoutRLS } from "./context/tenantContext.js";
import { multiTenancyExtension } from "./extensions/multiTenancy.js";
import { fieldEncryptionMiddleware } from "./server.js";

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

  // マルチテナンシー拡張を適用
  const extendedClient = client.$extends(multiTenancyExtension).$extends({
    client: {
      // RLSをバイパスして実行するヘルパーメソッド
      async $runWithoutRLS<T>(
        fn: (db: PrismaClient) => Promise<T>,
      ): Promise<T> {
        // 新しいクライアントインスタンスを作成してRLSバイパス
        const cleanClient = new PrismaClient({
          adapter: new PrismaNeon({
            connectionString: process.env.DATABASE_URL!,
          }),
          log:
            process.env.NODE_ENV === "development"
              ? ["query", "error", "warn"]
              : ["error"],
        });
        cleanClient.$use(fieldEncryptionMiddleware());
        return runWithoutRLS(async () => fn(cleanClient));
      },
    },
    query: {
      // TODO: userMcpServer の　parse をここで行う
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

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = PrismaClient;
