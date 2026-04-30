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
import { certificatesRoute, resetBootstrapPublicKeyCache } from "../route.js";

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
  resetBootstrapPublicKeyCache();
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

describe("POST /v1/certificates/enroll - mTLS パス", () => {
  test("socket.authorized=true かつ有効な CN の場合に 200 で証明書を返す", async () => {
    vi.mocked(signCertificate).mockResolvedValue({
      certificate:
        "-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----",
      caChain: "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----",
    });

    const mockSocket = {
      authorized: true,
      getPeerCertificate: () => ({ subject: { CN: "org-001" } }),
    };

    const res = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
      { incoming: { socket: mockSocket } },
    );

    expect(res.status).toStrictEqual(200);
    const body = (await res.json()) as { certificate: string; caChain: string };
    expect(body.certificate).toStrictEqual(
      "-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----",
    );
    expect(body.caChain).toStrictEqual(
      "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----",
    );
  });

  test("socket.authorized=false の場合に 401 を返す", async () => {
    const mockSocket = {
      authorized: false,
      getPeerCertificate: () => ({ subject: { CN: "org-001" } }),
    };

    const res = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
      { incoming: { socket: mockSocket } },
    );

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Valid client certificate required");
  });

  test("socket.authorized=true かつ CN が null の場合に 401 を返す", async () => {
    const mockSocket = {
      authorized: true,
      getPeerCertificate: () => ({ subject: { CN: null } }),
    };

    const res = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
      { incoming: { socket: mockSocket } },
    );

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual(
      "Certificate must have org_id in CN field",
    );
  });

  test("socket.authorized=true かつ有効な CN だが JSON パースに失敗した場合に 400 を返す", async () => {
    const mockSocket = {
      authorized: true,
      getPeerCertificate: () => ({ subject: { CN: "org-001" } }),
    };

    const res = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json",
      },
      { incoming: { socket: mockSocket } },
    );

    expect(res.status).toStrictEqual(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid request body");
  });
});

describe("POST /v1/certificates/enroll - Bootstrap Token エッジケース", () => {
  test("jwtVerify が Error 以外をスローした場合に 401 を返す", async () => {
    setupValidBootstrapToken();
    vi.mocked(jwtVerify).mockRejectedValue("string error");

    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
      },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid or expired bootstrap token");
  });

  test("jwtVerify の payload.sub が undefined の場合に 401 を返す", async () => {
    setupValidBootstrapToken();
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { iss: "rayven-cloud", aud: "tumiki-cloud-api" },
      protectedHeader: { alg: "RS256" },
    } as unknown as JWTVerifyResult & ResolvedKey);

    const res = await certificatesRoute.request("/v1/certificates/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
      },
      body: JSON.stringify({ csr: VALID_CSR }),
    });

    expect(res.status).toStrictEqual(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toStrictEqual("Invalid or expired bootstrap token");
  });

  test("PEM が変わった場合に公開鍵キャッシュを再生成して認証できる", async () => {
    vi.stubEnv(
      "BOOTSTRAP_TOKEN_PUBLIC_KEY",
      "-----BEGIN PUBLIC KEY-----\nPEM_A\n-----END PUBLIC KEY-----",
    );
    vi.mocked(importSPKI).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof importSPKI>>,
    );
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: "org-001", iss: "rayven-cloud", aud: "tumiki-cloud-api" },
      protectedHeader: { alg: "RS256" },
    } as unknown as JWTVerifyResult & ResolvedKey);
    vi.mocked(signCertificate).mockResolvedValue({
      certificate:
        "-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----",
      caChain: "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----",
    });

    const firstRes = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
        },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
    );
    expect(firstRes.status).toStrictEqual(200);

    vi.stubEnv(
      "BOOTSTRAP_TOKEN_PUBLIC_KEY",
      "-----BEGIN PUBLIC KEY-----\nPEM_B\n-----END PUBLIC KEY-----",
    );
    vi.mocked(importSPKI).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof importSPKI>>,
    );
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: "org-002", iss: "rayven-cloud", aud: "tumiki-cloud-api" },
      protectedHeader: { alg: "RS256" },
    } as unknown as JWTVerifyResult & ResolvedKey);
    vi.mocked(signCertificate).mockResolvedValue({
      certificate:
        "-----BEGIN CERTIFICATE-----\ncert2\n-----END CERTIFICATE-----",
      caChain: "-----BEGIN CERTIFICATE-----\nchain2\n-----END CERTIFICATE-----",
    });

    const secondRes = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
        },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
    );
    expect(secondRes.status).toStrictEqual(200);
  });
});

describe("POST /v1/certificates/enroll - キャッシュリセット", () => {
  test("importSPKI が失敗した後、次のリクエストで再試行できる", async () => {
    vi.stubEnv(
      "BOOTSTRAP_TOKEN_PUBLIC_KEY",
      "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----",
    );
    vi.mocked(importSPKI).mockRejectedValueOnce(new Error("Invalid PEM"));

    const firstRes = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
        },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
    );

    expect(firstRes.status).toStrictEqual(401);

    vi.mocked(importSPKI).mockResolvedValueOnce(
      {} as unknown as Awaited<ReturnType<typeof importSPKI>>,
    );
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: "org-001", iss: "rayven-cloud", aud: "tumiki-cloud-api" },
      protectedHeader: { alg: "RS256" },
    } as unknown as JWTVerifyResult & ResolvedKey);
    vi.mocked(signCertificate).mockResolvedValueOnce({
      certificate:
        "-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----",
      caChain: "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----",
    });

    const secondRes = await certificatesRoute.request(
      "/v1/certificates/enroll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOOTSTRAP_TOKEN_PREFIX}valid-jwt-payload`,
        },
        body: JSON.stringify({ csr: VALID_CSR }),
      },
    );

    expect(secondRes.status).toStrictEqual(200);
  });
});
