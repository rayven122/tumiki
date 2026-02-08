import { DomainError } from "./domainError.js";

/**
 * 認証コンテキストが見つからない場合のエラー
 */
export const createAuthContextMissingError = (): DomainError =>
  new DomainError("AUTH_CONTEXT_MISSING", "認証コンテキストが見つかりません");

/**
 * 組織IDが一致しない場合のエラー
 */
export const createOrganizationMismatchError = (
  expected: string,
  actual: string,
): DomainError =>
  new DomainError(
    "ORGANIZATION_MISMATCH",
    `組織IDが一致しません: 期待値 ${expected}, 実際の値 ${actual}`,
  );
