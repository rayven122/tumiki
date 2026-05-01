// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";
import {
  exportPKCS8,
  exportSPKI,
  generateKeyPair,
  importPKCS8,
  SignJWT,
} from "jose";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import {
  LICENSE_JWT_AUDIENCE,
  LICENSE_JWT_ISSUER,
  LICENSE_KEY_PREFIX,
} from "../../constants/config.js";
import {
  resetLicensePublicKeyCache,
  verifyLicenseMiddleware,
  type LicenseContextVariables,
} from "../verifyLicense.js";

let publicKeyPem: string;
let privateKeyPem: string;
let otherPublicKeyPem: string;

const issueTestLicense = async (
  payload: Record<string, unknown>,
  options: { ttlSeconds?: number; issuer?: string; audience?: string } = {},
): Promise<string> => {
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  const {
    ttlSeconds = 3600,
    issuer = LICENSE_JWT_ISSUER,
    audience = LICENSE_JWT_AUDIENCE,
  } = options;

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(privateKey);

  return `${LICENSE_KEY_PREFIX}${jwt}`;
};

const buildTestApp = (requiredFeature?: "dynamic-search") => {
  const app = new Hono<{ Variables: LicenseContextVariables }>();
  app.use("/protected", verifyLicenseMiddleware(requiredFeature));
  app.get("/protected", (c) => {
    return c.json({ ok: true, license: c.var.license });
  });
  return app;
};

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  publicKeyPem = await exportSPKI(pair.publicKey);
  privateKeyPem = await exportPKCS8(pair.privateKey);

  const other = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  otherPublicKeyPem = await exportSPKI(other.publicKey);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetLicensePublicKeyCache();
});

describe("verifyLicenseMiddleware（ライセンス検証ミドルウェア）", () => {
  test("有効な personal ライセンスで認証が通る", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["dynamic-search"],
      plan: "pro",
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      license: { sub: string };
    };
    expect(body.ok).toBe(true);
    expect(body.license.sub).toBe("user_abc");
  });

  test("有効な tenant ライセンスで認証が通る", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const licenseKey = await issueTestLicense({
      sub: "user_xyz",
      type: "tenant",
      tenant: "acme",
      features: ["dynamic-search"],
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      license: { tenant: string; type: string };
    };
    expect(body.license.tenant).toBe("acme");
    expect(body.license.type).toBe("tenant");
  });

  test("LICENSE_PUBLIC_KEY 未設定なら 500", async () => {
    const app = buildTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer tumiki_lic_xxx" },
    });
    expect(res.status).toBe(500);
  });

  test("Authorization ヘッダなしなら 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  test("Bearer プレフィックスがないと 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "tumiki_lic_xxx" },
    });
    expect(res.status).toBe(401);
  });

  test("ライセンスキーのプレフィックスが違うと 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer eyJhbGc.foo.bar" },
    });
    expect(res.status).toBe(401);
  });

  test("有効期限切れのライセンスは 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const licenseKey = await issueTestLicense(
      { sub: "user_abc", type: "personal", features: ["dynamic-search"] },
      { ttlSeconds: -1 },
    );

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    expect(res.status).toBe(401);
  });

  test("署名が違う公開鍵で検証すると 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", otherPublicKeyPem);
    const app = buildTestApp();
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["dynamic-search"],
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    expect(res.status).toBe(401);
  });

  test("Issuer が不正なら 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const licenseKey = await issueTestLicense(
      { sub: "user_abc", type: "personal", features: ["dynamic-search"] },
      { issuer: "evil-issuer" },
    );

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    expect(res.status).toBe(401);
  });

  test("type が不正なら 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp();
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "invalid",
      features: ["dynamic-search"],
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    expect(res.status).toBe(401);
  });

  test("必須機能を持たないライセンスは 403", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp("dynamic-search");
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["pii-dashboard"],
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    expect(res.status).toBe(403);
  });

  test("必須機能を持つライセンスは 200", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const app = buildTestApp("dynamic-search");
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["dynamic-search", "pii-dashboard"],
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    expect(res.status).toBe(200);
  });
});
