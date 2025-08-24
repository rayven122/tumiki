/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  AuthServerMetadata,
  ClientMetadata,
  ProtectedResourceMetadata,
} from "../types.js";
import {
  discoverAuthServer,
  discoverProtectedResource,
  parseWWWAuthenticate,
  registerClient,
} from "../dcrClient.js";

// モックfetch
global.fetch = vi.fn();

// console.logなどをモック
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

describe("DCRClient Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // console メソッドをモック
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.debug = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // console メソッドを復元
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  });

  describe("parseWWWAuthenticate", () => {
    test("Bearer認証ヘッダーをパースできる", () => {
      const header = 'Bearer realm="example", scope="read write"';
      const result = parseWWWAuthenticate(header);

      expect(result).toStrictEqual({
        scheme: "Bearer",
        realm: "example",
        scope: "read write",
      });
    });

    test("エラー情報を含むヘッダーをパースできる", () => {
      const header =
        'Bearer error="invalid_token", error_description="Token expired"';
      const result = parseWWWAuthenticate(header);

      expect(result).toStrictEqual({
        scheme: "Bearer",
        error: "invalid_token",
        error_description: "Token expired",
      });
    });

    test("不正なヘッダー形式でエラーをスローする", () => {
      const header = "InvalidHeader";
      expect(() => parseWWWAuthenticate(header)).toThrow(
        "Invalid WWW-Authenticate header format",
      );
    });
  });

  describe("discoverAuthServer", () => {
    test("Authorization Server Metadataを取得できる", async () => {
      const mockMetadata: AuthServerMetadata = {
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        registration_endpoint: "https://auth.example.com/register",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await discoverAuthServer("https://auth.example.com");

      expect(result).toStrictEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/.well-known/oauth-authorization-server",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Accept: "application/json",
          }),
        }),
      );
    });

    test("OAuth metadataが404の場合、OpenID Connect Discoveryにフォールバック", async () => {
      const mockMetadata: AuthServerMetadata = {
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetadata,
        });

      const result = await discoverAuthServer("https://auth.example.com");

      expect(result).toStrictEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "https://auth.example.com/.well-known/openid-configuration",
        expect.any(Object),
      );
    });

    test("必須フィールドが不足している場合エラーをスローする", async () => {
      const invalidMetadata = {
        issuer: "https://auth.example.com",
        // authorization_endpoint と token_endpoint が不足
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidMetadata,
      });

      await expect(
        discoverAuthServer("https://auth.example.com"),
      ).rejects.toThrow("Invalid Authorization Server Metadata");
    });
  });

  describe("discoverProtectedResource", () => {
    test("Protected Resource Metadataを取得できる", async () => {
      const mockMetadata: ProtectedResourceMetadata = {
        resource: "https://api.example.com",
        authorization_servers: ["https://auth.example.com"],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await discoverProtectedResource("https://api.example.com");

      expect(result).toStrictEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/.well-known/oauth-protected-resource",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    test("404の場合はnullを返す", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await discoverProtectedResource("https://api.example.com");

      expect(result).toBeNull();
      expect(console.debug).toHaveBeenCalledWith(
        "Protected Resource Metadata not found",
        expect.any(Object),
      );
    });
  });

  describe("registerClient", () => {
    test("クライアントを正常に登録できる", async () => {
      const metadata: ClientMetadata = {
        client_name: "Test Client",
        redirect_uris: ["https://app.example.com/callback"],
        grant_types: ["authorization_code"],
      };

      const mockCredentials = {
        client_id: "test-client-id",
        client_secret: "test-client-secret",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCredentials,
      });

      const result = await registerClient(
        "https://auth.example.com/register",
        metadata,
      );

      expect(result).toStrictEqual(mockCredentials);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/register",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(metadata),
        }),
      );
    });

    test("認証トークン付きで登録できる", async () => {
      const metadata: ClientMetadata = {
        client_name: "Test Client",
        redirect_uris: ["https://app.example.com/callback"],
      };

      const mockCredentials = {
        client_id: "test-client-id",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCredentials,
      });

      await registerClient("https://auth.example.com/register", metadata, {
        accessToken: "bearer-token",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/register",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer bearer-token",
          }),
        }),
      );
    });

    test("登録失敗時にエラーをスローする", async () => {
      const metadata: ClientMetadata = {
        client_name: "Test Client",
        redirect_uris: ["https://app.example.com/callback"],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: "invalid_request",
            error_description: "Invalid client metadata",
          }),
      });

      await expect(
        registerClient("https://auth.example.com/register", metadata),
      ).rejects.toThrow("Invalid client metadata");
    });

    test("client_idが不足している場合エラーをスローする", async () => {
      const metadata: ClientMetadata = {
        client_name: "Test Client",
        redirect_uris: ["https://app.example.com/callback"],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // client_idが不足
      });

      await expect(
        registerClient("https://auth.example.com/register", metadata),
      ).rejects.toThrow("Invalid registration response: missing client_id");
    });
  });
});
