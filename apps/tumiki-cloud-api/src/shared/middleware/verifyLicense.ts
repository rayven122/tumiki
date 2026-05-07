// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * ライセンス JWT 検証ミドルウェア
 *
 * RAYVEN が RS256 で署名したライセンスキー（tumiki_lic_<JWT> 形式）を
 * 公開鍵で検証する。検証結果を c.var.license に格納する。
 */

import type { Context, MiddlewareHandler, Next } from "hono";
import { importSPKI, jwtVerify } from "jose";

import {
  LICENSE_JWT_AUDIENCE,
  LICENSE_JWT_ISSUER,
  LICENSE_KEY_PREFIX,
} from "../constants/config.js";

/**
 * ライセンスタイプ
 * - personal: 個人ユーザー（長命 JWT・直接 desktop に投入）
 * - tenant: 法人テナント（短命 JWT・internal-manager が発行）
 */
export type LicenseType = "personal" | "tenant";

/**
 * EE 機能の識別子
 */
export type LicenseFeature =
  | "dynamic-search"
  | "pii-dashboard"
  | "organization-creation"
  | "custom-roles";

/**
 * 検証済みライセンスのペイロード
 */
export type VerifiedLicense = {
  sub: string;
  type: LicenseType;
  features: LicenseFeature[];
  exp: number;
  tenant?: string;
  plan?: string;
};

/**
 * Hono Context Variables の型拡張
 */
export type LicenseContextVariables = {
  license: VerifiedLicense;
};

// 公開鍵のパースは暗号演算を伴うため、Promise をキャッシュしてスタンピードを防ぐ
type LicensePublicKey = Awaited<ReturnType<typeof importSPKI>>;
let cachedPublicKeyPem: string | null = null;
let cachedPublicKeyPromise: Promise<LicensePublicKey> | null = null;

const getLicensePublicKey = (pem: string): Promise<LicensePublicKey> => {
  if (cachedPublicKeyPromise === null || cachedPublicKeyPem !== pem) {
    cachedPublicKeyPem = pem;
    const promise = importSPKI(pem, "RS256");
    promise.catch(() => {
      if (cachedPublicKeyPem === pem) {
        cachedPublicKeyPromise = null;
        cachedPublicKeyPem = null;
      }
    });
    cachedPublicKeyPromise = promise;
  }
  return cachedPublicKeyPromise;
};

/**
 * 公開鍵キャッシュをリセットする
 *
 * @internal テスト専用
 */
export const resetLicensePublicKeyCache = (): void => {
  cachedPublicKeyPem = null;
  cachedPublicKeyPromise = null;
};

/**
 * ライセンス JWT を検証する
 */
const verifyLicense = async (
  licenseKey: string,
  publicKeyPem: string,
): Promise<VerifiedLicense | null> => {
  if (!licenseKey.startsWith(LICENSE_KEY_PREFIX)) {
    return null;
  }

  const jwt = licenseKey.slice(LICENSE_KEY_PREFIX.length);

  try {
    const publicKey = await getLicensePublicKey(publicKeyPem);
    const { payload } = await jwtVerify(jwt, publicKey, {
      issuer: LICENSE_JWT_ISSUER,
      audience: LICENSE_JWT_AUDIENCE,
      requiredClaims: ["exp", "sub", "type", "features"],
    });

    const sub = payload.sub;
    const type = payload.type;
    const features = payload.features;
    const exp = payload.exp;
    const tenant = payload.tenant;
    const plan = payload.plan;

    if (typeof sub !== "string" || sub.length === 0) return null;
    if (type !== "personal" && type !== "tenant") return null;
    if (
      !Array.isArray(features) ||
      !features.every((f) => typeof f === "string")
    ) {
      return null;
    }
    if (typeof exp !== "number") return null;
    if (tenant !== undefined && typeof tenant !== "string") return null;
    if (plan !== undefined && typeof plan !== "string") return null;

    return {
      sub,
      type,
      features: features as LicenseFeature[],
      exp,
      tenant,
      plan,
    };
  } catch {
    return null;
  }
};

/**
 * ライセンス検証ミドルウェア
 *
 * 必須機能を指定すると、その機能を持たないライセンスは 403 で拒否する
 */
export const verifyLicenseMiddleware = (
  requiredFeature?: LicenseFeature,
): MiddlewareHandler<{ Variables: LicenseContextVariables }> => {
  return async (
    c: Context<{ Variables: LicenseContextVariables }>,
    next: Next,
  ) => {
    const publicKeyPem = process.env.LICENSE_PUBLIC_KEY;
    if (!publicKeyPem) {
      console.error(
        "[verifyLicense] LICENSE_PUBLIC_KEY env var is not configured",
      );
      return c.json({ error: "Server misconfiguration" }, 500);
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const licenseKey = authHeader.slice(7);
    const license = await verifyLicense(licenseKey, publicKeyPem);
    if (!license) {
      return c.json({ error: "Invalid or expired license" }, 401);
    }

    if (requiredFeature && !license.features.includes(requiredFeature)) {
      return c.json(
        { error: `License does not include feature: ${requiredFeature}` },
        403,
      );
    }

    c.set("license", license);
    await next();
  };
};
