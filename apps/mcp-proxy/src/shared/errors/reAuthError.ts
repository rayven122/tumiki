/**
 * ReAuthRequiredError 専用のエラーハンドリング
 *
 * MCP 仕様（2025-03-26）に準拠した 401 レスポンスを生成し、
 * クライアントが OAuth 2.1 フローを開始できるようにする。
 *
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
 */

import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";

/**
 * ReAuthError 用の 401 レスポンス型
 */
export type ReAuthErrorResponse = {
  httpStatus: 401;
  headers: Record<string, string>;
  jsonRpcError: {
    jsonrpc: "2.0";
    id: string | number | null;
    error: {
      code: number;
      message: string;
      data: {
        type: "ReAuthRequired";
        resource_metadata: string;
      };
    };
  };
};

/**
 * ReAuthRequiredError の型ガード
 *
 * @param error - 検査対象のエラー
 * @returns ReAuthRequiredError の場合は true
 */
export const isReAuthRequiredError = (
  error: unknown,
): error is ReAuthRequiredError => {
  return error instanceof ReAuthRequiredError;
};

/**
 * 401 レスポンスを生成
 *
 * MCP 仕様準拠の WWW-Authenticate ヘッダーと JSON-RPC エラーを生成。
 * クライアントは resource_metadata URL から認可サーバー情報を取得し、
 * OAuth 2.1 + PKCE フローを開始できる。
 *
 * @param error - ReAuthRequiredError
 * @param mcpServerId - MCP サーバー ID
 * @param requestId - JSON-RPC リクエスト ID
 * @param baseUrl - MCP Proxy のベース URL
 * @returns 401 レスポンス情報
 */
export const createReAuthResponse = (
  error: ReAuthRequiredError,
  mcpServerId: string,
  requestId: string | number | null,
  baseUrl: string,
): ReAuthErrorResponse => {
  // RFC 9728 準拠の resource_metadata URL を生成
  const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource/mcp/${mcpServerId}`;

  return {
    httpStatus: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
    },
    jsonRpcError: {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32600, // Invalid Request
        message: `Re-authentication required: ${error.message}`,
        data: {
          type: "ReAuthRequired",
          resource_metadata: resourceMetadataUrl,
        },
      },
    },
  };
};
