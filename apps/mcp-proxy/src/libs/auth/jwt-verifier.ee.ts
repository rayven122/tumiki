/**
 * SPDX-License-Identifier: Elastic-2.0
 * This file is part of Tumiki Enterprise Edition.
 */

/**
 * 統一 JWT 検証関数
 *
 * Keycloak 発行の JWT トークンを検証するための共通関数。
 * openid-client の ServerMetadata キャッシュと jose の jwtVerify を使用。
 */

import { jwtVerify } from "jose";
import { getKeycloakServerMetadata, getJWKS } from "./keycloak.ee.js";
import type { JWTPayload } from "../../types/index.js";

/**
 * Keycloak JWT を検証
 *
 * @param accessToken - Bearer トークン（"Bearer " プレフィックスなし）
 * @returns 検証済み JWT ペイロード
 * @throws 検証失敗時はエラーをスロー
 */
export const verifyKeycloakJWT = async (
  accessToken: string,
): Promise<JWTPayload> => {
  const metadata = await getKeycloakServerMetadata();
  const jwks = await getJWKS();

  const { payload } = await jwtVerify(accessToken, jwks, {
    issuer: metadata.issuer,
    clockTolerance: 60, // 60秒のクロックスキュー許容
  });

  return payload as JWTPayload;
};
