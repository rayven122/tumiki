// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { createMiddleware } from "hono/factory";
import { importSPKI, jwtVerify } from "jose";

type AuthVariables = {
  orgId: string;
};

// 公開鍵のパースは暗号演算を伴うため、モジュールスコープでキャッシュする
type PublicKey = Awaited<ReturnType<typeof importSPKI>>;
let cachedPublicKey: PublicKey | null = null;

const getPublicKey = async (pem: string): Promise<PublicKey> => {
  cachedPublicKey ??= await importSPKI(pem, "RS256");
  return cachedPublicKey;
};

/**
 * Short-lived JWT を検証して orgId をコンテキストに設定するミドルウェア
 */
export const jwtAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.slice(7);
    const publicKeyPem = process.env.JWT_SIGNING_PUBLIC_KEY;
    if (!publicKeyPem) {
      return c.json({ error: "Internal Server Error" }, 500);
    }

    try {
      const publicKey = await getPublicKey(publicKeyPem);
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: "tumiki-cloud-api",
        audience: "tumiki-desktop",
      });

      const orgId = payload.sub;
      if (!orgId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      c.set("orgId", orgId);
      await next();
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  },
);
