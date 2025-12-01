/**
 * OAuth State Token管理
 * PKCEパラメータをJWTとして暗号化/復号化してstateパラメータとして使用
 */

import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

/**
 * OAuthStatePayloadのZodスキーマ
 */
export const OAuthStatePayloadSchema = z.object({
  state: z.string(),
  codeVerifier: z.string(),
  codeChallenge: z.string(),
  nonce: z.string(),
  mcpServerId: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  redirectUri: z.string(),
  requestedScopes: z.array(z.string()),
  expiresAt: z.number(),
  // JWTの標準クレームも許容（jwtVerifyが追加するため）
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type OAuthStatePayload = z.infer<typeof OAuthStatePayloadSchema>;

/**
 * JWTシークレットキーを取得
 */
const getSecretKey = (): Uint8Array => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET environment variable is required");
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

  // Zodスキーマによる型安全な検証（JWTクレームは除外）
  const validated = OAuthStatePayloadSchema.omit({
    iat: true,
    exp: true,
  }).parse(payload);

  const token = await new SignJWT({ ...validated })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(validated.expiresAt / 1000)) // JWTはUnix timestamp（秒）
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
  const { payload } = await jwtVerify(token, secret);

  // Zodスキーマによる型安全な検証
  return OAuthStatePayloadSchema.parse(payload);
};
