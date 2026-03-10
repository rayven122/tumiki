import type { TransportType, AuthType } from "@tumiki/db";

/**
 * TransportTypeをクライアント用トランスポートタイプに変換
 */
export const mapTransportType = (
  dbTransportType: TransportType,
): "sse" | "http" | "stdio" => {
  switch (dbTransportType) {
    case "SSE":
      return "sse";
    case "STREAMABLE_HTTPS":
      return "http";
    case "STDIO":
      return "stdio";
    default:
      throw new Error(`Unknown transport type: ${String(dbTransportType)}`);
  }
};

/**
 * AuthTypeをクライアント用認証タイプに変換
 */
export const mapAuthType = (
  dbAuthType: AuthType,
): "none" | "bearer" | "api_key" => {
  switch (dbAuthType) {
    case "NONE":
      return "none";
    case "API_KEY":
      return "api_key";
    case "OAUTH":
      return "bearer";
    default:
      throw new Error(`Unknown auth type: ${String(dbAuthType)}`);
  }
};
