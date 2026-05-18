/**
 * Upstream MCP サーバーから返るエラーが「認証失敗（再認証必須）」かどうかを判定する。
 *
 * MCP SDK の StreamableHTTPClientTransport はサーバー応答の HTTP ステータスを
 * 例外メッセージに埋め込む（例: "HTTP 401"）。OAuth2 のトークン失効や
 * Bearer トークンの拒否はここで観測できる。判定は誤検知を避けるため厳密に行う:
 *
 *   - メッセージ中に `401` / `403` / `Unauthorized` / `Forbidden` を含む
 *   - OAuth2 標準のエラーコード（invalid_token / token_expired 等）
 *
 * 5xx や接続エラー、JSON-RPC application error は本判定の対象外（TRANSIENT 扱い）。
 */
const AUTH_ERROR_PATTERNS = [
  /\b401\b/,
  /\b403\b/,
  /\bUnauthorized\b/i,
  /\bForbidden\b/i,
  /\binvalid[_-]?token\b/i,
  /\btoken[_-]?expired\b/i,
  /\bexpired[_-]?token\b/i,
];

export const isUpstreamAuthError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!message) return false;
  return AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};
