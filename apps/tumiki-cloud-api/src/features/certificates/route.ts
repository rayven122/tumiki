// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

// POST /v1/certificates/enroll: Bootstrap Token/mTLS で認証して CSR に署名

import type { TLSSocket } from "node:tls";

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { importSPKI, jwtVerify } from "jose";

import { BOOTSTRAP_TOKEN_CONFIG } from "../../shared/constants/config.js";
import { enrollRequestSchema } from "./schema.js";
import { signCertificate } from "./service.js";

// 公開鍵のパースは暗号演算を伴うため、Promise をキャッシュしてスタンピードを防ぐ
type BootstrapPublicKey = Awaited<ReturnType<typeof importSPKI>>;
let cachedBootstrapPem: string | null = null;
let cachedPublicKeyPromise: Promise<BootstrapPublicKey> | null = null;

const getBootstrapPublicKey = (pem: string): Promise<BootstrapPublicKey> => {
  if (cachedPublicKeyPromise === null || cachedBootstrapPem !== pem) {
    cachedBootstrapPem = pem;
    cachedPublicKeyPromise = importSPKI(pem, "RS256");
  }
  return cachedPublicKeyPromise;
};

// Bootstrap Token を検証して org_id を返す（RAYVEN が RS256 署名、sub に org_id）
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
      requiredClaims: ["exp", "sub"],
    });

    return payload.sub ?? null;
  } catch (err) {
    console.error(
      "[certificates/enroll] Bootstrap token verification failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return null;
  }
};

const certificatesRoute = new Hono();

// CSR は通常数 KB 以下のため 50KB に制限してメモリ枯渇攻撃を防ぐ
// TODO: レート制限は上流リバースプロキシ（nginx/Cloudflare）で実装予定
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
    console.warn("[certificates/enroll] Failed to parse request body:", err);
    return c.json({ error: "Invalid request body" }, 400);
  }

  const parsed = enrollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  try {
    const result = await signCertificate(parsed.data.csr, orgId);
    const authMethod = authHeader ? "bootstrap" : "mtls";
    console.log(
      `[certificates/enroll] Certificate issued: orgId=${orgId} authMethod=${authMethod} at=${new Date().toISOString()}`,
    );
    return c.json(result);
  } catch (err) {
    console.error("[certificates/enroll] Failed to sign certificate:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export { certificatesRoute };
