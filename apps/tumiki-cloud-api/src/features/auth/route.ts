// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * POST /v1/auth/token
 *
 * mTLS で認証済みのクライアント証明書から org_id を取得し、
 * Tumiki Desktop が動的ツール検索 API を直接呼び出すための
 * Short-lived JWT を発行する。
 */

import { Hono } from "hono";
import { importPKCS8, SignJWT } from "jose";
import type { TLSSocket } from "node:tls";

import { JWT_CONFIG } from "../../shared/constants/config.js";

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

  const token = await issueShortLivedJwt(orgId);
  if (!token) {
    return c.json({ error: "Internal Server Error" }, 500);
  }

  const ttlSeconds =
    Number(process.env.JWT_TTL_SECONDS) || JWT_CONFIG.defaultTtlSeconds;

  return c.json({ token, expiresIn: ttlSeconds });
});

const issueShortLivedJwt = async (orgId: string): Promise<string | null> => {
  const privateKeyPem = process.env.JWT_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) return null;

  const ttlSeconds =
    Number(process.env.JWT_TTL_SECONDS) || JWT_CONFIG.defaultTtlSeconds;

  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  return new SignJWT({ org_id: orgId })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(orgId)
    .setIssuer("tumiki-cloud-api")
    .setAudience("tumiki-desktop")
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(privateKey);
};

export { authRoute };
