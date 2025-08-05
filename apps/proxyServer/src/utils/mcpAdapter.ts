import { type Request } from "express";
import { type IncomingMessage } from "node:http";
import { type AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * ExpressのRequestオブジェクトをMCP SDKが期待する型に変換するアダプター関数
 *
 * ExpressのRequestはIncomingMessageを継承しているため、
 * 型アサーションなしで直接使用できます。
 *
 * @param req Express Request オブジェクト
 * @returns MCP SDK互換のリクエストオブジェクト
 */
export const toMcpRequest = (
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
    clientId: (authData.payload.sub as string) || "oauth-client",
    scopes: Array.isArray(authData.payload.scope)
      ? (authData.payload.scope as string[])
      : typeof authData.payload.scope === "string"
        ? authData.payload.scope.split(" ")
        : [],
    expiresAt: authData.payload.exp as number | undefined,
  };
};
