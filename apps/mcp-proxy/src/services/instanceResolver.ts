import { db } from "@tumiki/db/server";
import type { UserMcpServerInstance } from "@tumiki/db";
import type { JWTPayload } from "../types/index.js";
import { logError, logInfo } from "../libs/logger/index.js";

/**
 * URL パスの instance_id と JWT ペイロードから UserMcpServerInstance を解決・検証する
 *
 * mcp_instance_id はURLパスから取得し、JWT の org_id と照合してデータ整合性を検証します。
 *
 * @param jwtPayload - JWT ペイロード
 * @param urlInstanceId - URL パスから取得した instance_id
 * @returns UserMcpServerInstance
 * @throws Error - インスタンスが見つからない、削除済み、組織不一致の場合
 */
export async function resolveUserMcpServerInstance(
  jwtPayload: JWTPayload,
  urlInstanceId: string,
): Promise<UserMcpServerInstance> {
  const { org_id, tumiki_user_id } = jwtPayload.tumiki;

  logInfo("Resolving UserMcpServerInstance by URL instance ID", {
    organizationId: org_id,
    mcpInstanceId: urlInstanceId,
    userId: tumiki_user_id,
  });

  // UserMcpServerInstance を取得（データ整合性検証）
  const instance = await db.userMcpServerInstance.findUnique({
    where: { id: urlInstanceId },
  });

  // 1. インスタンスの存在確認
  if (!instance) {
    logError(
      "MCP server instance not found",
      new Error("MCP server instance not found"),
      {
        mcpInstanceId: urlInstanceId,
        organizationId: org_id,
      },
    );
    throw new Error(
      `MCP server instance not found: ${urlInstanceId}. Please verify the URL.`,
    );
  }

  // 2. 論理削除チェック
  if (instance.deletedAt !== null) {
    logError(
      "MCP server instance is deleted",
      new Error("MCP server instance is deleted"),
      {
        mcpInstanceId: urlInstanceId,
        deletedAt: instance.deletedAt,
      },
    );
    throw new Error(
      `MCP server instance is deleted: ${urlInstanceId}. Please contact support.`,
    );
  }

  // 3. 組織の整合性チェック（JWT の org_id と instance の organizationId が一致するか）
  if (instance.organizationId !== org_id) {
    logError(
      "Organization ID mismatch",
      new Error("Organization ID mismatch"),
      {
        jwtOrgId: org_id,
        instanceOrgId: instance.organizationId,
        mcpInstanceId: urlInstanceId,
      },
    );
    throw new Error(
      `Organization ID mismatch for instance ${urlInstanceId}. Access denied.`,
    );
  }

  logInfo("UserMcpServerInstance resolved successfully by URL instance ID", {
    instanceId: instance.id,
    instanceName: instance.name,
    organizationId: org_id,
  });

  return instance;
}
