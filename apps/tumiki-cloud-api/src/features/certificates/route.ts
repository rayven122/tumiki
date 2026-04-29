// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * POST /v1/certificates/enroll
 *
 * Kubernetes TLS Bootstrapping パターンに基づく証明書自動発行エンドポイント。
 * - 初回: Bootstrap Token で認証 → CSR に署名して証明書を返す
 * - 更新: 既存クライアント証明書（mTLS）で認証 → 新証明書を返す
 */

import { Hono } from "hono";
import { importSPKI, jwtVerify } from "jose";

import { BOOTSTRAP_TOKEN_CONFIG } from "../../shared/constants/config.js";
import { enrollRequestSchema } from "./schema.js";
import { signCertificate } from "./service.js";

const certificatesRoute = new Hono();

certificatesRoute.post("/v1/certificates/enroll", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  // Bootstrap Token（tumiki_ プレフィックスの JWT）を検証
  if (!token.startsWith(BOOTSTRAP_TOKEN_CONFIG.prefix)) {
    // TODO: 更新時は mTLS クライアント証明書で認証
    return c.json({ error: "Unauthorized" }, 401);
  }

  const orgId = await verifyBootstrapToken(token);
  if (!orgId) {
    return c.json({ error: "Invalid or expired bootstrap token" }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const parsed = enrollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const result = await signCertificate(parsed.data.csr, orgId);
  return c.json(result);
});

/**
 * Bootstrap Token を検証して org_id を返す
 *
 * Bootstrap Token は RAYVEN が RS256 で署名した JWT。
 * sub クレームに org_id が入っている。
 */
const verifyBootstrapToken = async (token: string): Promise<string | null> => {
  const publicKeyPem = process.env.BOOTSTRAP_TOKEN_PUBLIC_KEY;
  if (!publicKeyPem) return null;

  try {
    const publicKey = await importSPKI(publicKeyPem, "RS256");
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "rayven-cloud",
      audience: "tumiki-cloud-api",
    });

    return payload.sub ?? null;
  } catch {
    return null;
  }
};

export { certificatesRoute };
