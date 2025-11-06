import { db } from "@tumiki/db/server";
import type { UserMcpServerInstance } from "@tumiki/db";
import type { JWTPayload } from "../types/index.js";
import { logError, logInfo } from "../libs/logger/index.js";

/**
 * JWT ペイロードから UserMcpServerInstance を解決・検証する
 *
 * JWTに含まれる mcp_instance_id を使用してインスタンスを取得し、
 * データ整合性を検証する（セキュリティとデータ整合性のため）
 *
 * @param jwtPayload - JWT ペイロード
 * @returns UserMcpServerInstance
 * @throws Error - インスタンスが見つからない、削除済み、組織不一致の場合
 */
export async function resolveUserMcpServerInstance(
  jwtPayload: JWTPayload,
): Promise<UserMcpServerInstance> {
  const { org_id, mcp_instance_id, tumiki_user_id } = jwtPayload.tumiki;

  logInfo("Resolving UserMcpServerInstance from JWT", {
    organizationId: org_id,
    mcpInstanceId: mcp_instance_id,
    userId: tumiki_user_id,
  });

  // UserMcpServerInstance を取得（データ整合性検証）
  const instance = await db.userMcpServerInstance.findUnique({
    where: { id: mcp_instance_id },
  });

  // 1. インスタンスの存在確認
  if (!instance) {
    logError(
      "MCP server instance not found",
      new Error("MCP server instance not found"),
      {
        mcpInstanceId: mcp_instance_id,
        organizationId: org_id,
      },
    );
    throw new Error(
      `MCP server instance not found: ${mcp_instance_id}. Please verify your JWT token.`,
    );
  }

  // 2. 論理削除チェック
  if (instance.deletedAt !== null) {
    logError(
      "MCP server instance is deleted",
      new Error("MCP server instance is deleted"),
      {
        mcpInstanceId: mcp_instance_id,
        deletedAt: instance.deletedAt,
      },
    );
    throw new Error(
      `MCP server instance is deleted: ${mcp_instance_id}. Please contact support.`,
    );
  }

  // 3. 組織の整合性チェック
  if (instance.organizationId !== org_id) {
    logError(
      "Organization ID mismatch",
      new Error("Organization ID mismatch"),
      {
        jwtOrgId: org_id,
        instanceOrgId: instance.organizationId,
        mcpInstanceId: mcp_instance_id,
      },
    );
    throw new Error(
      `Organization ID mismatch for instance ${mcp_instance_id}. Access denied.`,
    );
  }

  logInfo("UserMcpServerInstance resolved successfully", {
    instanceId: instance.id,
    instanceName: instance.name,
    organizationId: org_id,
  });

  return instance;
}
