import type { Request } from "express";
import type { IncomingMessage } from "node:http";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * ExpressのRequestオブジェクトをMCP SDKが期待する型に変換するアダプター関数
 *
 * ExpressのRequestはIncomingMessageを継承しているため、
 * 型アサーションなしで直接使用できます。
 *
 * @param req Express Request オブジェクト
 * @returns MCP SDK互換のリクエストオブジェクト
 */
export const toMcpRequest: (
  req: Request,
) => IncomingMessage & { auth?: AuthInfo } = (
  req: Request,
): IncomingMessage & { auth?: AuthInfo } => {
  // ExpressのRequestはIncomingMessageを継承しているため、
  // 直接キャストできます
  return req as IncomingMessage & { auth?: AuthInfo };
};

/**
 * express-oauth2-jwt-bearerのauth情報をMCP SDKのAuthInfo形式に変換
 *
 * @param authData express-oauth2-jwt-bearerのauth情報
 * @returns MCP SDK互換のAuthInfo
 */
export const convertToMcpAuthInfo = (authData: {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  token: string;
}): AuthInfo => {
  return {
    token: authData.token,
    clientId:
      typeof authData.payload.sub === "string"
        ? authData.payload.sub
        : "oauth-client",
    scopes: Array.isArray(authData.payload.scope)
      ? (authData.payload.scope as string[])
      : typeof authData.payload.scope === "string"
        ? authData.payload.scope.split(" ")
        : [],
    expiresAt: authData.payload.exp as number | undefined,
  };
};

/**
 * MCPプロトコルに必要なAcceptヘッダーを確認・追加する関数
 *
 * MCP SDKはAcceptヘッダーに"application/json"と"text/event-stream"の
 * 両方が含まれていることを要求します。
 *
 * @param req Express Request オブジェクト
 * @returns 修正されたリクエストオブジェクト
 */
export const ensureMcpAcceptHeader = (req: Request): Request => {
  const acceptHeader = req.headers.accept;
  const requiredTypes = ["application/json", "text/event-stream"];

  // Acceptヘッダーがない、または必要な値が含まれていない場合
  if (
    !acceptHeader ||
    !requiredTypes.every((type) => acceptHeader.includes(type))
  ) {
    // 必要なAcceptヘッダーを設定
    req.headers.accept = "application/json, text/event-stream";
  }

  return req;
};
