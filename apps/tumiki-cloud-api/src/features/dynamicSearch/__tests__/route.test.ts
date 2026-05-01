// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

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
} from "../../../shared/constants/config.js";
import { resetLicensePublicKeyCache } from "../../../shared/middleware/verifyLicense.js";
import { dynamicSearchRoute } from "../route.js";

let publicKeyPem: string;
let privateKeyPem: string;

const issueTestLicense = async (
  payload: Record<string, unknown>,
): Promise<string> => {
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(LICENSE_JWT_ISSUER)
    .setAudience(LICENSE_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
  return `${LICENSE_KEY_PREFIX}${jwt}`;
};

vi.mock("../service.js", () => ({
  searchTools: vi.fn(async () => ({
    results: [
      { toolName: "send_message", relevanceScore: 0.95 },
      { toolName: "list_channels", relevanceScore: 0.6 },
    ],
  })),
}));

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  publicKeyPem = await exportSPKI(pair.publicKey);
  privateKeyPem = await exportPKCS8(pair.privateKey);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetLicensePublicKeyCache();
});

describe("POST /v1/dynamic-search/search（動的ツール検索エンドポイント）", () => {
  test("認証なしは 401", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const res = await dynamicSearchRoute.request("/v1/dynamic-search/search", {
      method: "POST",
      body: JSON.stringify({ query: "test", tools: [{ name: "x" }] }),
    });
    expect(res.status).toBe(401);
  });

  test("dynamic-search 機能を持たないライセンスは 403", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["pii-dashboard"],
    });

    const res = await dynamicSearchRoute.request("/v1/dynamic-search/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${licenseKey}` },
      body: JSON.stringify({ query: "test", tools: [{ name: "x" }] }),
    });
    expect(res.status).toBe(403);
  });

  test("無効な JSON ボディは 400", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["dynamic-search"],
    });

    const res = await dynamicSearchRoute.request("/v1/dynamic-search/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        "Content-Type": "application/json",
      },
      body: "{invalid",
    });
    expect(res.status).toBe(400);
  });

  test("ツールリスト空は 400", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["dynamic-search"],
    });

    const res = await dynamicSearchRoute.request("/v1/dynamic-search/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "test", tools: [] }),
    });
    expect(res.status).toBe(400);
  });

  test("有効なリクエストは 200 で検索結果を返す", async () => {
    vi.stubEnv("LICENSE_PUBLIC_KEY", publicKeyPem);
    const licenseKey = await issueTestLicense({
      sub: "user_abc",
      type: "personal",
      features: ["dynamic-search"],
    });

    const res = await dynamicSearchRoute.request("/v1/dynamic-search/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "Slack にメッセージ送信",
        tools: [
          { name: "send_message", description: "Slack にメッセージを送る" },
          { name: "list_channels", description: "チャンネル一覧" },
        ],
        limit: 5,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: Array<{ toolName: string; relevanceScore: number }>;
    };
    expect(body.results).toHaveLength(2);
    expect(body.results[0]?.toolName).toBe("send_message");
  });
});
