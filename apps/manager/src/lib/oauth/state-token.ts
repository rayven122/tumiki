/**
 * OAuth State Token管理
 * PKCEパラメータをJWTとして暗号化/復号化してstateパラメータとして使用
 */

import { SignJWT, jwtVerify } from "jose";

export type OAuthStatePayload = {
  state: string; // CSRF対策用のランダム文字列
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  mcpServerId: string;
  userId: string;
  organizationId: string;
  redirectUri: string;
  requestedScopes: string[];
  expiresAt: number; // Unix timestamp
};

/**
 * JWTシークレットキーを取得
 */
const getSecretKey = (): Uint8Array => {
  const secret = process.env.OAUTH_STATE_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "OAUTH_STATE_SECRET or NEXTAUTH_SECRET environment variable is required",
    );
  }
  return new TextEncoder().encode(secret);
};

/**
 * OAuth state tokenを生成
 */
export const createStateToken = async (
  payload: OAuthStatePayload,
): Promise<string> => {
  const secret = getSecretKey();

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000)) // JWTはUnix timestamp（秒）
    .sign(secret);

  return token;
};

/**
 * OAuth state tokenを検証・復号化
 */
export const verifyStateToken = async (
  token: string,
): Promise<OAuthStatePayload> => {
  const secret = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as OAuthStatePayload;
  } catch (error) {
    throw new Error(
      `Invalid state token: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
