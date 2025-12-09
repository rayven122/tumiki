import type { Prisma } from "@prisma/client";
import { type PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "prisma-field-encryption";

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

  // フィールド暗号化、マルチテナンシー拡張
  const extendedClient = client
    .$extends(fieldEncryptionExtension())
    .$extends(multiTenancyExtension);
  return extendedClient as PrismaClient;
};
