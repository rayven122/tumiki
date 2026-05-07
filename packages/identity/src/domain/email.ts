// email を canonical form に正規化する pure 関数
// 大文字小文字差異・前後空白を吸収し、linking キーとして使えるようにする

import type { Brand } from "./branded.js";

export type CanonicalEmail = Brand<string, "CanonicalEmail">;

// email_verified が true でない限り linking には使わない
// これは IdP からの主張を信用するかどうかを表すフラグ
export type VerifiedEmail = {
  readonly canonical: CanonicalEmail;
  readonly verified: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value);

export const canonicalizeEmail = (value: string): CanonicalEmail => {
  const trimmed = value.trim().toLowerCase();
  return trimmed as CanonicalEmail;
};
