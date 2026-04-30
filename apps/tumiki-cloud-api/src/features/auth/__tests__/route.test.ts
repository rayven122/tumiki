// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { afterEach, describe, expect, test, vi } from "vitest";
import type { TLSSocket } from "node:tls";

vi.mock("jose", () => ({
  importPKCS8: vi.fn(),
  SignJWT: vi.fn(),
}));

import { importPKCS8, SignJWT } from "jose";
import { authRoute } from "../route.js";

/** テスト用にソケットを c.env.incoming.socket に注入してリクエストを送信する */
const sendRequest = (socketOverride?: Partial<TLSSocket>) => {
  const env = { incoming: { socket: socketOverride } };
  const req = new Request("http://localhost/v1/auth/token", { method: "POST" });
  return authRoute.fetch(req, env);
};

/** 有効な mTLS 証明書ソケットを生成するヘルパー */
const makeAuthorizedSocket = (cn: string): Partial<TLSSocket> => ({
  authorized: true,
  getPeerCertificate: vi.fn().mockReturnValue({
    subject: { CN: cn },
  }) as unknown as TLSSocket["getPeerCertificate"],
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /v1/auth/token", () => {
  test("socket.authorized が false の場合に 401 を返す", async () => {
    const res = await sendRequest({ authorized: false });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Valid client certificate required");
  });

  test("socket.authorized が true でも CN がない場合に 401 を返す", async () => {
    const res = await sendRequest({
      authorized: true,
      getPeerCertificate: vi.fn().mockReturnValue({
        subject: { CN: undefined },
      }) as unknown as TLSSocket["getPeerCertificate"],
    });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual(
      "Certificate must have org_id in CN field",
    );
  });

  test("JWT_SIGNING_PRIVATE_KEY 未設定の場合に 500 を返す", async () => {
    vi.stubEnv("JWT_SIGNING_PRIVATE_KEY", "");

    const res = await sendRequest(makeAuthorizedSocket("org-001"));

    expect(res.status).toStrictEqual(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Internal Server Error");
  });

  test("有効な mTLS 証明書と秘密鍵で JWT を発行して 200 を返す", async () => {
    vi.stubEnv(
      "JWT_SIGNING_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
    );

    const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
    vi.mocked(SignJWT).mockImplementation(
      () =>
        ({
          setProtectedHeader: vi.fn().mockReturnThis(),
          setSubject: vi.fn().mockReturnThis(),
          setIssuer: vi.fn().mockReturnThis(),
          setAudience: vi.fn().mockReturnThis(),
          setIssuedAt: vi.fn().mockReturnThis(),
          setExpirationTime: vi.fn().mockReturnThis(),
          sign: mockSign,
        }) as unknown as InstanceType<typeof SignJWT>,
    );
    vi.mocked(importPKCS8).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof importPKCS8>>,
    );

    const res = await sendRequest(makeAuthorizedSocket("org-001"));

    expect(res.status).toStrictEqual(200);
    const body = (await res.json()) as { token: string; expiresIn: number };
    expect(body.token).toStrictEqual("mock-jwt-token");
    expect(typeof body.expiresIn).toStrictEqual("number");
  });
});
