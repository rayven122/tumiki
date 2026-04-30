// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * POST /v1/auth/token
 *
 * mTLS で認証済みのクライアント証明書から org_id を取得し、
 * Tumiki Desktop が動的ツール検索 API を直接呼び出すための
 * Short-lived JWT を発行する。
 */

import type { TLSSocket } from "node:tls";

import { Hono } from "hono";
import { importPKCS8, SignJWT } from "jose";

import { JWT_CONFIG } from "../../shared/constants/config.js";

// 秘密鍵のパースは暗号演算を伴うため、モジュールスコープでキャッシュする
type PrivateKey = Awaited<ReturnType<typeof importPKCS8>>;
let cachedPrivateKeyPem: string | null = null;
let cachedPrivateKey: PrivateKey | null = null;

const getPrivateKey = async (pem: string): Promise<PrivateKey> => {
  if (cachedPrivateKey === null || cachedPrivateKeyPem !== pem) {
    cachedPrivateKey = await importPKCS8(pem, "RS256");
    cachedPrivateKeyPem = pem;
  }
  return cachedPrivateKey;
};

const authRoute = new Hono();

authRoute.post("/v1/auth/token", async (c) => {
  // @hono/node-server が Node.js の IncomingMessage を env.incoming に格納する
  const incoming = (c.env as { incoming?: { socket?: TLSSocket } } | undefined)
    ?.incoming;
  const socket = incoming?.socket;

  // mTLS: クライアント証明書の検証
  if (!socket?.authorized) {
    return c.json({ error: "Valid client certificate required" }, 401);
  }

  const cert = socket.getPeerCertificate();
  const orgId = cert?.subject?.CN;

  if (!orgId) {
    return c.json({ error: "Certificate must have org_id in CN field" }, 401);
  }

  const result = await issueShortLivedJwt(orgId);
  if (!result) {
    return c.json({ error: "Internal Server Error" }, 500);
  }

  return c.json({ token: result.token, expiresIn: result.ttlSeconds });
});

const issueShortLivedJwt = async (
  orgId: string,
): Promise<{ token: string; ttlSeconds: number } | null> => {
  const privateKeyPem = process.env.JWT_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) {
    console.error("[auth/token] JWT_SIGNING_PRIVATE_KEY is not configured");
    return null;
  }

  const ttlSeconds =
    Number(process.env.JWT_TTL_SECONDS) || JWT_CONFIG.defaultTtlSeconds;

  const privateKey = await getPrivateKey(privateKeyPem);

  const token = await new SignJWT({ org_id: orgId })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(orgId)
    .setIssuer("tumiki-cloud-api")
    .setAudience("tumiki-desktop")
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(privateKey);

  return { token, ttlSeconds };
};

export { authRoute };
