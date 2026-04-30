// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { signCertificate } from "../service.js";

const BASE_ENV = {
  INFISICAL_URL: "https://infisical.example.com",
  INFISICAL_API_TOKEN: "test-token",
  INFISICAL_CA_ID: "test-ca-id",
};

const buildMockFetch = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("signCertificate / 環境変数バリデーション", () => {
  beforeEach(() => {
    vi.stubEnv("INFISICAL_URL", BASE_ENV.INFISICAL_URL);
    vi.stubEnv("INFISICAL_API_TOKEN", BASE_ENV.INFISICAL_API_TOKEN);
    vi.stubEnv("INFISICAL_CA_ID", BASE_ENV.INFISICAL_CA_ID);
  });

  test("INFISICAL_URL が未設定の場合にエラーをスロー", async () => {
    vi.stubEnv("INFISICAL_URL", "");

    await expect(signCertificate("csr-data", "org-001")).rejects.toThrow(
      "Infisical configuration is missing",
    );
  });

  test("INFISICAL_API_TOKEN が未設定の場合にエラーをスロー", async () => {
    vi.stubEnv("INFISICAL_API_TOKEN", "");

    await expect(signCertificate("csr-data", "org-001")).rejects.toThrow(
      "Infisical configuration is missing",
    );
  });

  test("INFISICAL_CA_ID が未設定の場合にエラーをスロー", async () => {
    vi.stubEnv("INFISICAL_CA_ID", "");

    await expect(signCertificate("csr-data", "org-001")).rejects.toThrow(
      "Infisical configuration is missing",
    );
  });
});

describe("signCertificate / Infisical API 連携", () => {
  beforeEach(() => {
    vi.stubEnv("INFISICAL_URL", BASE_ENV.INFISICAL_URL);
    vi.stubEnv("INFISICAL_API_TOKEN", BASE_ENV.INFISICAL_API_TOKEN);
    vi.stubEnv("INFISICAL_CA_ID", BASE_ENV.INFISICAL_CA_ID);
  });

  test("Infisical API が 200 を返す場合に証明書を返す", async () => {
    const mockResponse = {
      certificate:
        "-----BEGIN CERTIFICATE-----\ncert-data\n-----END CERTIFICATE-----",
      certificateChain:
        "-----BEGIN CERTIFICATE-----\nchain-data\n-----END CERTIFICATE-----",
    };
    vi.stubGlobal("fetch", buildMockFetch(200, mockResponse));

    const result = await signCertificate("csr-data", "org-001");

    expect(result).toStrictEqual({
      certificate: mockResponse.certificate,
      caChain: mockResponse.certificateChain,
    });
  });

  test("Infisical API が 400 を返す場合に Certificate signing failed エラーをスロー", async () => {
    vi.stubGlobal(
      "fetch",
      buildMockFetch(400, { message: "bad request detail" }),
    );

    await expect(signCertificate("csr-data", "org-001")).rejects.toThrow(
      "Certificate signing failed",
    );
  });

  test("Infisical API が 500 を返す場合に Certificate signing failed エラーをスロー（レスポンスボディは漏洩しない）", async () => {
    vi.stubGlobal(
      "fetch",
      buildMockFetch(500, { message: "internal server error detail" }),
    );

    const error = await signCertificate("csr-data", "org-001").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toStrictEqual("Certificate signing failed");
    expect(message).not.toContain("internal server error detail");
  });

  test("正しいリクエスト形式で Infisical API が呼ばれることを確認（commonName が orgId と一致）", async () => {
    const mockFetch = buildMockFetch(200, {
      certificate: "cert",
      certificateChain: "chain",
    });
    vi.stubGlobal("fetch", mockFetch);

    await signCertificate("my-csr", "org-xyz");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toStrictEqual(
      `${BASE_ENV.INFISICAL_URL}/api/v1/pki/ca/${BASE_ENV.INFISICAL_CA_ID}/sign-certificate`,
    );
    expect(options.method).toStrictEqual("POST");
    expect(options.headers).toStrictEqual({
      Authorization: `Bearer ${BASE_ENV.INFISICAL_API_TOKEN}`,
      "Content-Type": "application/json",
    });
    const parsedBody = JSON.parse(options.body as string) as unknown;
    expect(parsedBody).toStrictEqual({
      csr: "my-csr",
      commonName: "org-xyz",
      ttl: "2160h",
    });
  });
});

describe("signCertificate / CERT_TTL バリデーション", () => {
  beforeEach(() => {
    vi.stubEnv("INFISICAL_URL", BASE_ENV.INFISICAL_URL);
    vi.stubEnv("INFISICAL_API_TOKEN", BASE_ENV.INFISICAL_API_TOKEN);
    vi.stubEnv("INFISICAL_CA_ID", BASE_ENV.INFISICAL_CA_ID);
  });

  test("不正な CERT_TTL 形式でエラーをスロー", async () => {
    vi.stubEnv("CERT_TTL", "invalid");

    await expect(signCertificate("csr-data", "org-001")).rejects.toThrow(
      'Invalid CERT_TTL format: "invalid"',
    );
  });

  test("CERT_TTL が '90d' の場合に正常に動作する", async () => {
    vi.stubEnv("CERT_TTL", "90d");
    const mockFetch = buildMockFetch(200, {
      certificate: "cert",
      certificateChain: "chain",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(signCertificate("csr-data", "org-001")).resolves.toBeDefined();

    const [, options] = mockFetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const parsedBody = JSON.parse(options.body as string) as unknown;
    expect(parsedBody).toStrictEqual({
      csr: "csr-data",
      commonName: "org-001",
      ttl: "90d",
    });
  });
});
