/**
 * Prisma操作引数の型定義
 */
export type PrismaArgs = {
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
 * 読み取り操作に organizationId フィルタを追加
 */
export const addReadFilter = (
  args: PrismaArgs,
  organizationId: string,
): void => {
  if (hasWhereProperty(args)) {
    args.where = {
      ...args.where,
      organizationId,
    };
  } else {
    args.where = {
      organizationId,
    };
  }
};

/**
 * 単一作成操作に organizationId を自動設定
 */
export const addCreateOrganizationId = (
  args: PrismaArgs,
  organizationId: string,
): void => {
  if (hasDataProperty(args)) {
    if (typeof args.data === "object" && !Array.isArray(args.data)) {
      args.data = {
        ...args.data,
        organizationId,
      };
    }
  } else {
    args.data = {
      organizationId,
    };
  }
};

/**
 * upsert 操作の create 部分に organizationId を設定
 */
export const addUpsertCreateOrganizationId = (
  args: PrismaArgs,
  organizationId: string,
): void => {
  if (hasCreateProperty(args)) {
    args.create = {
      ...args.create,
      organizationId,
    };
  }
};

/**
 * 複数作成操作に organizationId を自動設定
 */
export const addCreateManyOrganizationId = (
  args: PrismaArgs,
  organizationId: string,
): void => {
  if (hasDataProperty(args)) {
    if (Array.isArray(args.data)) {
      args.data = args.data.map((item: Record<string, unknown>) => ({
        ...item,
        organizationId,
      }));
    }
  }
};

/**
 * 更新・削除操作に organizationId フィルタを追加
 */
export const addWriteFilter = (
  args: PrismaArgs,
  organizationId: string,
): void => {
  if (hasWhereProperty(args)) {
    args.where = {
      ...args.where,
      organizationId,
    };
  } else {
    args.where = {
      organizationId,
    };
  }
};
