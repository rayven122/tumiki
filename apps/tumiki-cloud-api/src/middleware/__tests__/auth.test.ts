// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import type { JWTVerifyResult, ResolvedKey } from "jose";
import { Hono } from "hono";
import { afterEach, describe, expect, test, vi } from "vitest";
import { jwtAuth } from "../auth.js";

vi.mock("jose", () => ({
  importSPKI: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { importSPKI, jwtVerify } from "jose";

// テスト用ローカル型（middleware/auth.ts 内部の AuthVariables と同義）
type AuthVariables = { orgId: string };

const buildApp = () => {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use("/*", jwtAuth);
  app.get("/test", (c) => c.json({ orgId: c.get("orgId") }));
  return app;
};

// importSPKI は jose 内部型のため unknown 経由でキャスト
const mockImportSPKI = () =>
  vi
    .mocked(importSPKI)
    .mockResolvedValue({} as unknown as Awaited<ReturnType<typeof importSPKI>>);

const mockJwtVerify = (payload: Record<string, unknown>) =>
  vi.mocked(jwtVerify).mockResolvedValue({
    payload,
    protectedHeader: { alg: "RS256" },
  } as unknown as JWTVerifyResult & ResolvedKey);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("jwtAuth ミドルウェア", () => {
  test("Authorization ヘッダーなしで 401 を返す", async () => {
    const app = buildApp();
    const res = await app.request("/test");
    expect(res.status).toStrictEqual(401);
    const body = await res.json();
    expect(body).toStrictEqual({ error: "Unauthorized" });
  });

  test("Bearer 以外の Authorization ヘッダーで 401 を返す", async () => {
    const app = buildApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Basic sometoken" },
    });
    expect(res.status).toStrictEqual(401);
    const body = await res.json();
    expect(body).toStrictEqual({ error: "Unauthorized" });
  });

  test("JWT_SIGNING_PUBLIC_KEY 未設定で 500 を返す", async () => {
    vi.stubEnv("JWT_SIGNING_PUBLIC_KEY", "");
    const app = buildApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer sometoken" },
    });
    expect(res.status).toStrictEqual(500);
    const body = await res.json();
    expect(body).toStrictEqual({ error: "Internal Server Error" });
  });

  test("不正なトークンで 401 を返す", async () => {
    vi.stubEnv("JWT_SIGNING_PUBLIC_KEY", "mock-public-key");
    mockImportSPKI();
    vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid token"));

    const app = buildApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer invalidtoken" },
    });
    expect(res.status).toStrictEqual(401);
    const body = await res.json();
    expect(body).toStrictEqual({ error: "Unauthorized" });
  });

  test("有効なトークンで next() が呼ばれ orgId がセットされる", async () => {
    vi.stubEnv("JWT_SIGNING_PUBLIC_KEY", "mock-public-key");
    mockImportSPKI();
    mockJwtVerify({
      sub: "org-123",
      iss: "tumiki-cloud-api",
      aud: "tumiki-desktop",
    });

    const app = buildApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer validtoken" },
    });
    expect(res.status).toStrictEqual(200);
    const body = await res.json();
    expect(body).toStrictEqual({ orgId: "org-123" });
  });

  test("payload.sub が undefined の場合に 401 を返す", async () => {
    vi.stubEnv("JWT_SIGNING_PUBLIC_KEY", "mock-public-key");
    mockImportSPKI();
    mockJwtVerify({ iss: "tumiki-cloud-api", aud: "tumiki-desktop" });

    const app = buildApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer validtoken" },
    });
    expect(res.status).toStrictEqual(401);
    const body = await res.json();
    expect(body).toStrictEqual({ error: "Unauthorized" });
  });
});
