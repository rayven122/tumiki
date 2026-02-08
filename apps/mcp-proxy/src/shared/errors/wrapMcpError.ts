import { DomainError } from "../../domain/errors/domainError.js";

/**
 * MCP 操作で発生したエラーを DomainError に統一する
 *
 * @param error - 捕捉したエラー
 * @param context - エラー発生箇所のコンテキスト
 * @returns 統一された DomainError
 */
export const wrapMcpError = (error: unknown, context: string): DomainError => {
  if (error instanceof DomainError) {
    return error;
  }

  if (error instanceof Error) {
    return new DomainError("MCP_ERROR", `${context}: ${error.message}`);
  }

  return new DomainError("UNKNOWN_ERROR", `${context}: Unknown error`);
};
