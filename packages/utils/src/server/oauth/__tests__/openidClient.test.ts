/**
 * OpenID Client OAuth Implementation のテスト
 */

import type { MockedFunction } from "vitest";
import * as client from "openid-client";
import { describe, expect, test, vi } from "vitest";

import {
  createUnifiedOAuthClient,
  generateNonce,
  generatePKCEChallenge,
  generatePKCEVerifier,
  generateState,
  isOAuth2Error,
} from "../openidClient.js";

// openid-clientの関数をモック
vi.mock("openid-client", async () => {
  const actual = await vi.importActual("openid-client");
  return {
    ...actual,
    discovery: vi.fn(),
    buildAuthorizationUrl: vi.fn(),
    randomState: vi.fn(),
    randomNonce: vi.fn(),
    randomPKCECodeVerifier: vi.fn(),
    calculatePKCECodeChallenge: vi.fn(),
  };
});

describe("generateState", () => {
  test("ステートを生成する", () => {
    (
      client.randomState as MockedFunction<typeof client.randomState>
    ).mockReturnValue("mock-state");

    const state = generateState();
    expect(state).toBe("mock-state");
    expect(client.randomState).toHaveBeenCalled();
  });
});

describe("generateNonce", () => {
  test("ナンスを生成する", () => {
    (
      client.randomNonce as MockedFunction<typeof client.randomNonce>
    ).mockReturnValue("mock-nonce");

    const nonce = generateNonce();
    expect(nonce).toBe("mock-nonce");
    expect(client.randomNonce).toHaveBeenCalled();
  });
});

describe("generatePKCEVerifier", () => {
  test("PKCE Code Verifierを生成する", () => {
    (
      client.randomPKCECodeVerifier as MockedFunction<
        typeof client.randomPKCECodeVerifier
      >
    ).mockReturnValue("mock-verifier");

    const verifier = generatePKCEVerifier();
    expect(verifier).toBe("mock-verifier");
    expect(client.randomPKCECodeVerifier).toHaveBeenCalled();
  });
});

describe("generatePKCEChallenge", () => {
  test("PKCE Code Challengeを生成する", async () => {
    (
      client.calculatePKCECodeChallenge as MockedFunction<
        typeof client.calculatePKCECodeChallenge
      >
    ).mockResolvedValue("mock-challenge");

    const challenge = await generatePKCEChallenge("mock-verifier");
    expect(challenge).toBe("mock-challenge");
    expect(client.calculatePKCECodeChallenge).toHaveBeenCalledWith(
      "mock-verifier",
    );
  });
});

describe("isOAuth2Error", () => {
  test("OAuth2エラーオブジェクトを正しく判定する", () => {
    const oauthError = {
      error: "invalid_request",
      error_description: "Invalid request",
    };

    expect(isOAuth2Error(oauthError)).toBe(true);
  });

  test("非OAuth2エラーオブジェクトを正しく判定する", () => {
    expect(isOAuth2Error(null)).toBe(false);
    expect(isOAuth2Error(undefined)).toBe(false);
    expect(isOAuth2Error("string")).toBe(false);
    expect(isOAuth2Error({})).toBe(false);
    expect(isOAuth2Error({ message: "error" })).toBe(false);
  });
});

describe("UnifiedOAuthClient", () => {
  test("クライアントを作成できる", () => {
    const oauthClient = createUnifiedOAuthClient();
    expect(oauthClient).toBeDefined();
    expect(typeof oauthClient.initialize).toBe("function");
    expect(typeof oauthClient.createAuthorizationUrl).toBe("function");
    expect(typeof oauthClient.handleCallback).toBe("function");
  });

  test("初期化前にメソッドを呼ぶとエラーになる", async () => {
    const oauthClient = createUnifiedOAuthClient();

    await expect(
      oauthClient.createAuthorizationUrl({
        redirect_uri: "http://example.com/callback",
        scope: "openid profile",
      }),
    ).rejects.toThrow("Client not initialized");
  });
});
