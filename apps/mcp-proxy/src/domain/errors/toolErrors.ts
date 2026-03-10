import { DomainError } from "./domainError.js";

/**
 * ツール名が不正な場合のエラー
 */
export const createInvalidToolNameError = (fullName: string): DomainError =>
  new DomainError(
    "INVALID_TOOL_NAME",
    `ツール名の形式が不正です: ${fullName}。"{インスタンス名}__{ツール名}" 形式が必要です`,
  );

/**
 * ツールが見つからない場合のエラー
 */
export const createToolNotFoundError = (
  instanceName: string,
  toolName: string,
): DomainError =>
  new DomainError(
    "TOOL_NOT_FOUND",
    `ツールが見つかりません: ${instanceName}__${toolName}`,
  );

/**
 * MCPサーバーが見つからない場合のエラー
 */
export const createMcpServerNotFoundError = (
  mcpServerId: string,
): DomainError =>
  new DomainError(
    "MCP_SERVER_NOT_FOUND",
    `MCPサーバーが見つかりません: ${mcpServerId}`,
  );
