import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { getTenantContext } from "../context/tenantContext.js";

/**
 * organizationIdフィールドを持つモデルのリスト
 * これらのモデルに対して自動的にテナントフィルタリングを適用
 */
const TENANT_SCOPED_MODELS = [
  "Organization",
  "OrganizationMember",
  "OrganizationGroup",
  "OrganizationRole",
  "OrganizationInvitation",
  "ResourceAccessControl",
  "UserMcpServerConfig",
  "UserToolGroup",
  "UserMcpServerInstance",
  "McpServerRequestLog",
  "McpServer", // 組織限定公開のMCPサーバー
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/**
 * モデルがテナントスコープを持つかチェック
 */
const isTenantScopedModel = (model: string): model is TenantScopedModel => {
  return TENANT_SCOPED_MODELS.includes(model as TenantScopedModel);
};

/**
 * Prisma操作引数の型定義
 */
type PrismaArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * 型ガード関数：whereプロパティの存在確認
 */
const hasWhereProperty = (
  args: unknown,
): args is { where: Record<string, unknown> } => {
  return typeof args === "object" && args !== null && "where" in args;
};

/**
 * 型ガード関数：dataプロパティの存在確認
 */
const hasDataProperty = (
  args: unknown,
): args is { data: Record<string, unknown> | Record<string, unknown>[] } => {
  return typeof args === "object" && args !== null && "data" in args;
};

/**
 * 型ガード関数：createプロパティの存在確認
 */
const hasCreateProperty = (
  args: unknown,
): args is { create: Record<string, unknown> } => {
  return typeof args === "object" && args !== null && "create" in args;
};

/**
 * マルチテナンシー拡張
 *
 * この拡張は、Prisma Clientのクエリに自動的にorganizationIdフィルタを追加し、
 * テナント間のデータ分離を実現します。
 *
 * @example
 * ```typescript
 * // 通常のクエリ（自動的にorganizationIdフィルタが適用される）
 * const configs = await db.userMcpServerConfig.findMany();
 *
 * // RLSをバイパスする場合
 * const allConfigs = await runWithoutRLS(async () => {
 *   return db.userMcpServerConfig.findMany();
 * });
 * ```
 */
export const multiTenancyExtension = Prisma.defineExtension({
  name: "multiTenancy",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const context = getTenantContext();

        // コンテキストがない場合はそのまま実行
        if (!context) {
          return query(args);
        }

        // RLSバイパスモードの場合はフィルタを適用しない
        if (context.bypassRLS) {
          return query(args);
        }

        // テナントスコープを持たないモデルはそのまま実行
        if (!isTenantScopedModel(model)) {
          return query(args);
        }

        // organizationIdがない場合はエラー
        if (!context.organizationId) {
          throw new Error(
            `Organization context is required for ${model} operations. ` +
              `Current operation: ${operation}`,
          );
        }

        // 読み取り操作にフィルタを追加
        if (
          operation === "findFirst" ||
          operation === "findFirstOrThrow" ||
          operation === "findMany" ||
          operation === "findUnique" ||
          operation === "findUniqueOrThrow" ||
          operation === "count" ||
          operation === "aggregate" ||
          operation === "groupBy"
        ) {
          args = args || {};
          if (hasWhereProperty(args)) {
            args.where = {
              ...args.where,
              organizationId: context.organizationId,
            };
          } else {
            (args as PrismaArgs).where = {
              organizationId: context.organizationId,
            };
          }
        }

        // 作成操作に組織IDを自動設定
        if (operation === "create" || operation === "upsert") {
          args = args || {};
          if (hasDataProperty(args)) {
            if (typeof args.data === "object" && !Array.isArray(args.data)) {
              args.data = {
                ...args.data,
                organizationId: context.organizationId,
              };
            }
          } else {
            (args as PrismaArgs).data = {
              organizationId: context.organizationId,
            };
          }

          // upsertの場合はcreateにも設定
          if (operation === "upsert" && hasCreateProperty(args)) {
            (args as PrismaArgs).create = {
              ...args.create,
              organizationId: context.organizationId,
            };
          }
        }

        // createManyの場合
        if (operation === "createMany") {
          args = args || {};
          if (hasDataProperty(args)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: Record<string, unknown>) => ({
                ...item,
                organizationId: context.organizationId,
              }));
            } else if (typeof args.data === "object") {
              args.data = {
                ...args.data,
                organizationId: context.organizationId,
              };
            }
          } else {
            (args as PrismaArgs).data = {
              organizationId: context.organizationId,
            };
          }
        }

        // 更新・削除操作にもフィルタを追加（安全性のため）
        if (
          operation === "update" ||
          operation === "updateMany" ||
          operation === "delete" ||
          operation === "deleteMany"
        ) {
          args = args || {};
          if (hasWhereProperty(args)) {
            args.where = {
              ...args.where,
              organizationId: context.organizationId,
            };
          } else {
            (args as PrismaArgs).where = {
              organizationId: context.organizationId,
            };
          }
        }

        // クエリを実行
        const result = await query(args);

        // デバッグモードの場合はログ出力
        if (context.debug) {
          console.log(`[MultiTenancy] ${model}.${operation}`, {
            organizationId: context.organizationId,
            args: JSON.stringify(args, null, 2),
          });
        }

        return result;
      },
    },
  },
});

/**
 * 特定のモデルに対してRLSを無効化するヘルパー
 *
 * @example
 * ```typescript
 * // 組織切り替え時など、全組織を取得する必要がある場合
 * const organizations = await db.$runWithoutRLS(async (db) => {
 *   return db.organizationMember.findMany({
 *     where: { userId: currentUserId }
 *   });
 * });
 * ```
 */
export type PrismaClientWithRLSControl = {
  $runWithoutRLS: <T>(fn: (db: PrismaClient) => Promise<T>) => Promise<T>;
};
