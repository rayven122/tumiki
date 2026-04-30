// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { afterEach, describe, expect, test, vi } from "vitest";
import type { JWTVerifyResult, ResolvedKey } from "jose";

vi.mock("jose", () => ({
  importSPKI: vi.fn(),
  jwtVerify: vi.fn(),
}));

vi.mock("../service.js", () => ({
  signCertificate: vi.fn(),
}));

import { importSPKI, jwtVerify } from "jose";
import { signCertificate } from "../service.js";
import { certificatesRoute } from "../route.js";

const VALID_CSR =
  "-----BEGIN CERTIFICATE REQUEST-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END CERTIFICATE REQUEST-----";

const BOOTSTRAP_TOKEN_PREFIX = "tumiki_";

/** Bootstrap Token 認証を有効な状態にセットアップするヘルパー */
const setupValidBootstrapToken = () => {
  vi.stubEnv(
    "BOOTSTRAP_TOKEN_PUBLIC_KEY",
    "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----",
  );
  vi.mocked(importSPKI).mockResolvedValue(
    {} as unknown as Awaited<ReturnType<typeof importSPKI>>,
  );
  vi.mocked(jwtVerify).mockResolvedValue({
    payload: { sub: "org-001", iss: "rayven-cloud", aud: "tumiki-cloud-api" },
    protectedHeader: { alg: "RS256" },
  } as unknown as JWTVerifyResult & ResolvedKey);
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /v1/certificates/enroll - Bootstrap Token パス", () => {
  test("Authorization ヘッダーなしで mTLS 証明書もない場合に 401 を返す", async () => {
    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Valid client certificate required");
  });

  test("Bearer トークンが tumiki_ で始まらない場合に 401 を返す", async () => {
    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_prefix_token",
      },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Unauthorized");
  });

  test("BOOTSTRAP_TOKEN_PUBLIC_KEY 未設定で 401 を返す", async () => {
    vi.stubEnv("BOOTSTRAP_TOKEN_PUBLIC_KEY", "");

    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}some-jwt-payload`,
      },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid or expired bootstrap token");
  });

  test("有効な Bootstrap Token で CSR を送信すると証明書を返す", async () => {
    setupValidBootstrapToken();
    vi.mocked(signCertificate).mockResolvedValue({
      certificate:
        "-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----",
      caChain: "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----",
    });

    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
      },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(200);
    const body = (await res.json()) as { certificate: string; caChain: string };
    expect(body.certificate).toStrictEqual(
      "-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----",
    );
    expect(body.caChain).toStrictEqual(
      "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----",
    );
  });
});

describe("POST /v1/certificates/enroll - CSR バリデーション", () => {
  test("PEM 形式でない CSR で 400 を返す", async () => {
    setupValidBootstrapToken();

    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
      },
      body: JSON.stringify({ csr: "not-a-pem-format" }),
    });

    expect(res.status).toStrictEqual(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid request body");
  });
});

describe("POST /v1/certificates/enroll - signCertificate エラー", () => {
  test("signCertificate がエラーをスローした場合に 500 を返す", async () => {
    setupValidBootstrapToken();
    vi.mocked(signCertificate).mockRejectedValue(
      new Error("Certificate signing failed"),
    );

    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
      },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Internal Server Error");
  });
});
