import { db } from "@tumiki/db/server";
import type { McpServer } from "@tumiki/db";
import type { JWTPayload } from "../types/index.js";
import { logError, logInfo } from "../libs/logger/index.js";

/**
 * JWT ペイロードから McpServer を解決・検証する
 *
 * mcp_server_id が含まれている場合のみ処理を行い、データ整合性を検証します。
 * mcp_server_id がない場合はエラーをスローします（管理画面用のJWTには不要なため）。
 *
 * @param jwtPayload - JWT ペイロード
 * @returns McpServer
 * @throws Error - mcp_server_id がない、サーバーが見つからない、削除済み、組織不一致の場合
 */
export const resolveMcpServer = async (
  jwtPayload: JWTPayload,
): Promise<McpServer> => {
  const { org_id, mcp_server_id, tumiki_user_id } = jwtPayload.tumiki;

  // mcp_server_id が存在しない場合はエラー
  if (!mcp_server_id) {
    logError(
      "mcp_server_id is required for MCP server access",
      new Error("mcp_server_id is required"),
      {
        organizationId: org_id,
        userId: tumiki_user_id,
      },
    );
    throw new Error(
      "mcp_server_id is required for MCP server access. This JWT is not valid for MCP operations.",
    );
  }

  logInfo("Resolving McpServer by ID from JWT", {
    organizationId: org_id,
    mcpServerId: mcp_server_id,
    userId: tumiki_user_id,
  });

  // McpServer を取得（データ整合性検証）
  const mcpServer = await db.mcpServer.findUnique({
    where: { id: mcp_server_id },
  });

  // 1. サーバーの存在確認
  if (!mcpServer) {
    logError("MCP server not found", new Error("MCP server not found"), {
      mcpServerId: mcp_server_id,
      organizationId: org_id,
    });
    throw new Error(
      `MCP server not found: ${mcp_server_id}. Please verify your JWT token.`,
    );
  }

  // 2. 論理削除チェック
  if (mcpServer.deletedAt !== null) {
    logError("MCP server is deleted", new Error("MCP server is deleted"), {
      mcpServerId: mcp_server_id,
      deletedAt: mcpServer.deletedAt,
    });
    throw new Error(
      `MCP server is deleted: ${mcp_server_id}. Please contact support.`,
    );
  }

  // 3. 組織の整合性チェック
  if (mcpServer.organizationId !== org_id) {
    logError(
      "Organization ID mismatch",
      new Error("Organization ID mismatch"),
      {
        jwtOrgId: org_id,
        serverOrgId: mcpServer.organizationId,
        mcpServerId: mcp_server_id,
      },
    );
    throw new Error(
      `Organization ID mismatch for server ${mcp_server_id}. Access denied.`,
    );
  }

  logInfo("McpServer resolved successfully by ID", {
    serverId: mcpServer.id,
    serverName: mcpServer.name,
    organizationId: org_id,
  });

  return mcpServer;
};
