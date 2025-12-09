import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { PrismaArgs } from "./filters.js";
import { getTenantContext } from "../../context/tenantContext.js";
import {
  addCreateManyOrganizationId,
  addCreateOrganizationId,
  addReadFilter,
  addUpsertCreateOrganizationId,
  addWriteFilter,
} from "./filters.js";
import {
  isTenantScopedModel,
  validateOrganizationContext,
} from "./validator.js";

/**
 * マルチテナンシー拡張
 *
 * この拡張は、Prisma Clientのクエリに自動的にorganizationIdフィルタを追加し、
 * テナント間のデータ分離を実現します。
 *
 * ## フィルタリングルール
 *
 * 対象モデル（TENANT_SCOPED_MODELS に定義）には、すべての操作で organizationId フィルタを自動適用：
 * - 読み取り（find*, count など）: WHERE organizationId = {currentOrgId}
 * - 作成（create）: organizationId を自動設定
 * - 更新・削除（update, delete など）: WHERE organizationId = {currentOrgId}
 *
 * ## 情報漏洩防止
 * - すべての操作には organizationId フィルタが自動適用
 * - テナントコンテキストなしのアクセスはエラーになる
 *
 */
export const multiTenancyExtension = Prisma.defineExtension({
  name: "multiTenancy",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const context = getTenantContext();

        // コンテキストがない、またはテナントスコープがない場合はスキップ
        if (!context || context.bypassRLS || !isTenantScopedModel(model)) {
          return query(args);
        }

        // organizationId コンテキストの検証
        validateOrganizationContext(context, model, operation);

        const operationArgs = (args || {}) as PrismaArgs;
        const organizationId = context.organizationId!;

        // 読み取り操作
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
          addReadFilter(operationArgs, organizationId);
        }

        // 単一作成操作
        if (operation === "create" || operation === "upsert") {
          addCreateOrganizationId(operationArgs, organizationId);

          // upsert の場合は create 部分にも設定
          if (operation === "upsert") {
            addUpsertCreateOrganizationId(operationArgs, organizationId);
          }
        }

        // 複数作成操作
        if (operation === "createMany") {
          addCreateManyOrganizationId(operationArgs, organizationId);
        }

        // 更新・削除操作
        if (
          operation === "update" ||
          operation === "updateMany" ||
          operation === "delete" ||
          operation === "deleteMany"
        ) {
          addWriteFilter(operationArgs, organizationId);
        }

        return query(operationArgs);
      },
    },
  },
});

/**
 * 特定のモデルに対してRLSを無効化するヘルパー
 * ```
 */
export type PrismaClientWithRLSControl = {
  $runWithoutRLS: <T>(fn: (db: PrismaClient) => Promise<T>) => Promise<T>;
};

// バリデーター関数のエクスポート
export {
  isTenantScopedModel,
  validateOrganizationContext,
} from "./validator.js";

// フィルター関数のエクスポート
export { type PrismaArgs } from "./filters.js";
export {
  addReadFilter,
  addCreateOrganizationId,
  addUpsertCreateOrganizationId,
  addCreateManyOrganizationId,
  addWriteFilter,
} from "./filters.js";
