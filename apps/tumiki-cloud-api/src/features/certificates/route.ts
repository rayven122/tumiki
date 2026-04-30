// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * POST /v1/certificates/enroll
 *
 * Kubernetes TLS Bootstrapping パターンに基づく証明書自動発行エンドポイント。
 * - 初回: Bootstrap Token で認証 → CSR に署名して証明書を返す
 * - 更新: 既存クライアント証明書（mTLS）で認証 → 新証明書を返す
 */

import type { TLSSocket } from "node:tls";

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { importSPKI, jwtVerify } from "jose";

import { BOOTSTRAP_TOKEN_CONFIG } from "../../shared/constants/config.js";
import { enrollRequestSchema } from "./schema.js";
import { signCertificate } from "./service.js";

// 公開鍵のパースは暗号演算を伴うため、モジュールスコープでキャッシュする
type BootstrapPublicKey = Awaited<ReturnType<typeof importSPKI>>;
let cachedBootstrapPem: string | null = null;
let cachedBootstrapPublicKey: BootstrapPublicKey | null = null;

const getBootstrapPublicKey = async (
  pem: string,
): Promise<BootstrapPublicKey> => {
  if (cachedBootstrapPublicKey === null || cachedBootstrapPem !== pem) {
    cachedBootstrapPublicKey = await importSPKI(pem, "RS256");
    cachedBootstrapPem = pem;
  }
  return cachedBootstrapPublicKey;
};

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
    const publicKey = await getBootstrapPublicKey(publicKeyPem);
    // tumiki_ プレフィックスを除去してから JWT として検証する
    const jwt = token.slice(BOOTSTRAP_TOKEN_CONFIG.prefix.length);
    const { payload } = await jwtVerify(jwt, publicKey, {
      issuer: "rayven-cloud",
      audience: "tumiki-cloud-api",
    });

    return payload.sub ?? null;
  } catch (err) {
    console.error(
      "[certificates/enroll] Bootstrap token verification failed:",
      err,
    );
    return null;
  }
};

const certificatesRoute = new Hono();

// CSR は通常数 KB 以下のため 50KB に制限してメモリ枯渇攻撃を防ぐ
certificatesRoute.use(
  "/v1/certificates/enroll",
  bodyLimit({ maxSize: 50 * 1024 }),
);

certificatesRoute.post("/v1/certificates/enroll", async (c) => {
  const authHeader = c.req.header("Authorization");
  let orgId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // Bootstrap Token（tumiki_ プレフィックスの JWT）を検証
    if (!token.startsWith(BOOTSTRAP_TOKEN_CONFIG.prefix)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    orgId = await verifyBootstrapToken(token);
    if (!orgId) {
      return c.json({ error: "Invalid or expired bootstrap token" }, 401);
    }
  } else {
    // 証明書更新パス: mTLS クライアント証明書で認証
    const incoming = (
      c.env as { incoming?: { socket?: TLSSocket } } | undefined
    )?.incoming;
    const socket = incoming?.socket;
    if (!socket?.authorized) {
      return c.json({ error: "Valid client certificate required" }, 401);
    }
    orgId = socket.getPeerCertificate()?.subject?.CN ?? null;
    if (!orgId) {
      return c.json({ error: "Certificate must have org_id in CN field" }, 401);
    }
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch (err) {
    console.error("[certificates/enroll] Failed to parse request body:", err);
    return c.json({ error: "Invalid request body" }, 400);
  }

  const parsed = enrollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  try {
    const result = await signCertificate(parsed.data.csr, orgId);
    return c.json(result);
  } catch (err) {
    console.error("[certificates/enroll] Failed to sign certificate:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export { certificatesRoute };
