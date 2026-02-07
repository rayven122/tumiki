/**
 * ドメインエラーコード
 */
type DomainErrorCode =
  | "INVALID_TOOL_NAME"
  | "TOOL_NOT_FOUND"
  | "MCP_SERVER_NOT_FOUND"
  | "AUTH_CONTEXT_MISSING"
  | "ORGANIZATION_MISMATCH"
  | "MCP_ERROR"
  | "UNKNOWN_ERROR";

/**
 * ドメインエラー基底クラス
 *
 * ビジネスルール違反を表現する型付きエラー
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export type { DomainErrorCode };
