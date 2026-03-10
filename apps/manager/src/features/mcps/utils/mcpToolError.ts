/**
 * MCPツール出力のエラー検出ユーティリティ
 */

/**
 * エラーを示すキーワード一覧
 */
const ERROR_KEYWORDS = [
  "failed to execute",
  "failed to connect",
  "mcp error",
  "oauth token not found",
  "user needs to authenticate",
  "unauthorized",
  "timed out",
  "timeout",
] as const;

/**
 * 出力からエラー状態を検出
 *
 * MCPエラーは以下の形式で返される:
 * - { content: [...], isError: true }
 * - "Failed to execute tool..." (文字列形式のエラー)
 */
export const detectErrorFromOutput = (output: unknown): boolean => {
  // オブジェクト形式: { isError: true }
  if (output && typeof output === "object") {
    const outputObj = output as { isError?: boolean };
    if (outputObj.isError === true) return true;
  }

  // 文字列形式: エラーメッセージを含む場合
  if (typeof output === "string") {
    const lowerOutput = output.toLowerCase();
    return ERROR_KEYWORDS.some((keyword) => lowerOutput.includes(keyword));
  }

  return false;
};

/**
 * 認証エラー情報の型
 */
export type AuthErrorInfo = {
  requiresReauth: boolean;
  mcpServerId: string;
};

/**
 * 出力から認証エラー情報を抽出する
 * 再認証が必要な場合はmcpServerIdを含むオブジェクトを返す
 *
 * requiresReauth: true が設定されている場合は errorType に関係なく
 * 認証エラーとして扱う（401エラーやReAuthRequiredエラーに対応）
 */
export const extractAuthError = (output: unknown): AuthErrorInfo | null => {
  if (!output || typeof output !== "object") return null;

  const obj = output as {
    isError?: boolean;
    errorType?: string;
    requiresReauth?: boolean;
    mcpServerId?: string;
  };

  // requiresReauth: true があれば認証エラーとして扱う
  if (
    obj.isError === true &&
    obj.requiresReauth === true &&
    typeof obj.mcpServerId === "string"
  ) {
    return {
      requiresReauth: true,
      mcpServerId: obj.mcpServerId,
    };
  }

  return null;
};
