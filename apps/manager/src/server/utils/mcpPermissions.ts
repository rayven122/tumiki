import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@tumiki/db/server";
import { isAdmin, type OrganizationInfo } from "./organizationPermissions";

/**
 * MCP権限タイプ
 *
 * Unix型権限システムに基づく3つの権限タイプ
 * - read: MCPサーバー情報の閲覧
 * - write: MCPサーバーの作成・更新・削除
 * - execute: MCPツールの実行（将来対応）
 */
export type McpPermissionType = "read" | "write" | "execute";

/**
 * MCP権限チェックオプション
 */
export type CheckMcpPermissionOptions = {
  /** 必要な権限タイプ */
  permission: McpPermissionType;
  /** 特定MCPサーバーID（省略時は全MCPサーバーに対する権限チェック） */
  mcpServerId?: string;
};

/**
 * 固定ロールのMCP権限マッピング
 *
 * Owner/Admin: 全権限
 * Member: read/write
 * Viewer: read のみ
 */
const FIXED_ROLE_MCP_PERMISSIONS: Record<string, McpPermissionType[]> = {
  Owner: ["read", "write", "execute"],
  Admin: ["read", "write", "execute"],
  Member: ["read", "write"],
  Viewer: ["read"],
};

/**
 * カスタムロールスラッグを抽出
 *
 * Keycloakのロール名 "org:{orgSlug}:role:{roleSlug}" 形式からroleSlugを抽出
 *
 * @param roles - ユーザーのロール配列
 * @param orgSlug - 組織のslug
 * @returns カスタムロールのslug配列
 */
export const extractCustomRoleSlugs = (
  roles: string[],
  orgSlug: string,
): string[] => {
  const prefix = `org:${orgSlug}:role:`;
  return roles
    .filter((role) => role.startsWith(prefix))
    .map((role) => role.slice(prefix.length));
};

/**
 * 固定ロールでMCP権限をチェック
 *
 * @param roles - ユーザーのロール配列
 * @param permission - チェックする権限タイプ
 * @returns 権限がある場合はtrue
 */
const checkFixedRoleMcpPermission = (
  roles: string[],
  permission: McpPermissionType,
): boolean => {
  for (const role of roles) {
    const allowedPermissions = FIXED_ROLE_MCP_PERMISSIONS[role];
    if (allowedPermissions?.includes(permission)) {
      return true;
    }
  }
  return false;
};

/**
 * MCP権限チェック関数
 *
 * ユーザーのロールからMCP権限を検証する。
 * 以下の優先順位でチェック:
 * 1. 個人組織は全権限を持つ
 * 2. 固定ロール（Owner/Admin）は全MCP権限を持つ
 * 3. 固定ロール（Member/Viewer）のMCP権限をチェック
 * 4. カスタムロールのデフォルト権限 + 特定MCPサーバー権限をチェック
 *
 * @param db - Prismaクライアント
 * @param organization - 組織情報（ctx.currentOrgから取得）
 * @param options - 権限チェックオプション
 * @returns 権限がある場合はtrue
 */
export const checkMcpPermission = async (
  db: PrismaClient,
  organization: OrganizationInfo,
  options: CheckMcpPermissionOptions,
): Promise<boolean> => {
  const { permission, mcpServerId } = options;

  // 1. 個人組織は全権限を持つ
  if (organization.isPersonal) {
    return true;
  }

  // 2. 固定ロール（Owner/Admin）は全MCP権限を持つ
  if (isAdmin(organization.roles)) {
    return true;
  }

  // 3. 固定ロール（Member/Viewer）のMCP権限をチェック
  if (checkFixedRoleMcpPermission(organization.roles, permission)) {
    return true;
  }

  // 4. カスタムロールのスラッグを抽出
  const customRoleSlugs = extractCustomRoleSlugs(
    organization.roles,
    organization.slug,
  );

  // カスタムロールがない場合は、固定ロールの結果で終了
  if (customRoleSlugs.length === 0) {
    return false;
  }

  // 5. OrganizationRoleからデフォルト権限を取得
  const orgRoles = await db.organizationRole.findMany({
    where: {
      organizationSlug: organization.slug,
      slug: { in: customRoleSlugs },
    },
    include: {
      // 特定MCPサーバーの場合のみ、McpPermissionを取得
      mcpPermissions: mcpServerId ? { where: { mcpServerId } } : false,
    },
  });

  // 6. いずれかのロールで権限があればOK
  for (const role of orgRoles) {
    // デフォルト権限チェック
    if (hasDefaultPermission(role, permission)) {
      return true;
    }

    // 特定MCPサーバーへの権限チェック
    if (mcpServerId && role.mcpPermissions) {
      for (const mcpPerm of role.mcpPermissions) {
        if (hasSpecificPermission(mcpPerm, permission)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * OrganizationRoleのデフォルト権限をチェック
 */
const hasDefaultPermission = (
  role: {
    defaultRead: boolean;
    defaultWrite: boolean;
    defaultExecute: boolean;
  },
  permission: McpPermissionType,
): boolean => {
  switch (permission) {
    case "read":
      return role.defaultRead;
    case "write":
      return role.defaultWrite;
    case "execute":
      return role.defaultExecute;
    default:
      return false;
  }
};

/**
 * McpPermissionの権限をチェック
 */
const hasSpecificPermission = (
  mcpPerm: { read: boolean; write: boolean; execute: boolean },
  permission: McpPermissionType,
): boolean => {
  switch (permission) {
    case "read":
      return mcpPerm.read;
    case "write":
      return mcpPerm.write;
    case "execute":
      return mcpPerm.execute;
    default:
      return false;
  }
};

/**
 * 権限タイプのラベルを取得
 */
const getPermissionLabel = (permission: McpPermissionType): string => {
  switch (permission) {
    case "read":
      return "閲覧";
    case "write":
      return "編集";
    case "execute":
      return "実行";
    default:
      return "操作";
  }
};

/**
 * MCP権限検証関数（エラースロー版）
 *
 * 権限がない場合はTRPCErrorをスローする。
 * APIエンドポイントで使用することを想定。
 *
 * @param db - Prismaクライアント
 * @param organization - 組織情報（ctx.currentOrgから取得）
 * @param options - 権限チェックオプション
 * @throws TRPCError - 権限がない場合
 */
export const validateMcpPermission = async (
  db: PrismaClient,
  organization: OrganizationInfo,
  options: CheckMcpPermissionOptions,
): Promise<void> => {
  const hasPermission = await checkMcpPermission(db, organization, options);
  if (!hasPermission) {
    const label = getPermissionLabel(options.permission);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `MCPサーバーの${label}権限がありません`,
    });
  }
};
