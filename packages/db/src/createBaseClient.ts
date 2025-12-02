import type { Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "prisma-field-encryption";

import { runWithoutRLS } from "./context/tenantContext.js";
import { multiTenancyExtension } from "./extensions/multiTenancy/index.js";

type ClientOptions = {
  adapter?: PrismaNeon;
  connectionString?: string;
};

/**
 * 共通のPrismaClient作成関数
 * fieldEncryptionExtension、multiTenancyExtension、$runWithoutRLSヘルパーを適用
 */
export const createBaseClient = (options?: ClientOptions) => {
  const clientConfig = {
    ...(options?.adapter && { adapter: options.adapter }),
    log:
      process.env.NODE_ENV === "development"
        ? (["query", "error", "warn"] as Prisma.LogLevel[])
        : (["error"] as Prisma.LogLevel[]),
    omit: {
      mcpConfig: {
        envVars: true,
      },
    },
  };

  const client = new PrismaClient(clientConfig);

  // フィールド暗号化、マルチテナンシー拡張、$runWithoutRLSヘルパーを適用
  const extendedClient = client
    .$extends(fieldEncryptionExtension())
    .$extends(multiTenancyExtension)
    .$extends({
      client: {
        // RLSをバイパスして実行するヘルパーメソッド
        async $runWithoutRLS<T>(fn: (db: unknown) => Promise<T>): Promise<T> {
          // 新しいクライアントインスタンスを作成してRLSバイパス
          const cleanClientConfig = {
            ...(options?.adapter && {
              adapter: new PrismaNeon({
                connectionString:
                  options.connectionString || process.env.DATABASE_URL!,
              }),
            }),
            log:
              process.env.NODE_ENV === "development"
                ? (["query", "error", "warn"] as Prisma.LogLevel[])
                : (["error"] as Prisma.LogLevel[]),
          };

          const cleanClient = new PrismaClient(cleanClientConfig).$extends(
            fieldEncryptionExtension(),
          );
          // 拡張されたクライアントを安全に渡すため、型アサーションを使用
          return runWithoutRLS(async () => fn(cleanClient as never));
        },
      },
      query: {
        // TODO: userMcpServer の parse をここで行う
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

  return extendedClient;
};
