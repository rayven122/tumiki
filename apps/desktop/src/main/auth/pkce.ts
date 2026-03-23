import { randomBytes, createHash } from "crypto";

/**
 * PKCEのcode_verifierを生成
 * 64バイトランダムデータをBase64 URL-safeエンコードした86文字の文字列（RFC 7636準拠、43〜128文字）
 */
export const generateCodeVerifier = (): string => {
  // 64バイト（512ビット）のランダムデータを生成
  const randomData = randomBytes(64);
  // Base64 URL-safe エンコード（パディングなし）
  return randomData
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

/**
 * PKCEのcode_challengeを生成
 * code_verifierのSHA-256ハッシュをBase64 URL-safeエンコード
 */
export const generateCodeChallenge = (codeVerifier: string): string => {
  const hash = createHash("sha256").update(codeVerifier).digest();
  // Base64 URL-safe エンコード（パディングなし）
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

/**
 * OAuth 2.0 stateパラメータを生成
 * CSRF攻撃を防ぐためのランダムな文字列
 */
export const generateState = (): string => {
  const randomData = randomBytes(16);
  return randomData.toString("hex");
};
