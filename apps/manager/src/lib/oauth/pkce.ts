/**
 * PKCE (Proof Key for Code Exchange) ユーティリティ
 * OAuth 2.0のセキュリティ強化のため
 */

import { webcrypto } from "node:crypto";

/**
 * ランダムな文字列を生成
 */
const generateRandomString = (length: number): string => {
  const array = new Uint8Array(length);
  webcrypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

/**
 * Code Verifierを生成
 * RFC 7636準拠: 43-128文字のBase64URL形式の文字列
 * エントロピー: 256ビット（32バイト = 43文字のBase64URL）
 */
export const generateCodeVerifier = (): string => {
  // RFC 7636推奨の最小長43文字に対応する32バイトを生成
  const array = new Uint8Array(32);
  webcrypto.getRandomValues(array);

  // Base64URL形式に変換（RFC 7636準拠の文字セット）
  return Buffer.from(array)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

/**
 * Code Challengeを生成
 * Code VerifierのSHA-256ハッシュをBase64URL形式に変換
 */
export const generateCodeChallenge = async (
  codeVerifier: string,
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await webcrypto.subtle.digest("SHA-256", data);

  // Base64URL形式に変換
  return Buffer.from(hash)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

/**
 * StateパラメータとNonceを生成
 * CSRF攻撃対策とリプレイ攻撃対策
 */
export const generateState = (): string => {
  return generateRandomString(32); // 64文字（32バイト）
};

export const generateNonce = (): string => {
  return generateRandomString(32); // 64文字（32バイト）
};

/**
 * PKCEパラメータ一式を生成
 */
export const generatePKCEParams = async (): Promise<{
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  nonce: string;
}> => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateNonce();

  return {
    codeVerifier,
    codeChallenge,
    state,
    nonce,
  };
};
