import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../../../utils/encryption");
vi.mock("../../../utils/credentials");
vi.mock("../oauth.token");
vi.mock("../oauth.repository");
vi.mock("../oauth.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../oauth.service")>();
  return {
    ...original,
  };
});

import { getDb } from "../../../shared/db";
import { encryptToken } from "../../../utils/encryption";
import { decryptCredentials } from "../../../utils/credentials";
import { refreshAccessToken } from "../oauth.token";
import * as oauthRepository from "../oauth.repository";
import {
  refreshOAuthTokenIfNeeded,
  refreshOAuthTokenIfNeededOnce,
  resolveOAuthHeaders,
  isTokenExpiringSoon,
} from "../oauth.refresh";

describe("oauth.refresh", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(encryptToken).mockImplementation(async (v) => `encrypted:${v}`);
  });

  describe("isTokenExpiringSoon", () => {
    test("expires_at がない場合は false を返す", () => {
      expect(isTokenExpiringSoon({ access_token: "abc" })).toBe(false);
    });

    test("expires_at が無効な値の場合は false を返す", () => {
      expect(
        isTokenExpiringSoon({ access_token: "abc", expires_at: "invalid" }),
      ).toBe(false);
    });

    test("期限まで5分以上ある場合は false を返す", () => {
      const futureExpiry = String(Math.floor(Date.now() / 1000) + 600);
      expect(
        isTokenExpiringSoon({ access_token: "abc", expires_at: futureExpiry }),
      ).toBe(false);
    });

    test("期限まで5分以内の場合は true を返す", () => {
      const soonExpiry = String(Math.floor(Date.now() / 1000) + 200);
      expect(
        isTokenExpiringSoon({ access_token: "abc", expires_at: soonExpiry }),
      ).toBe(true);
    });

    test("既に期限切れの場合は true を返す", () => {
      const pastExpiry = String(Math.floor(Date.now() / 1000) - 100);
      expect(
        isTokenExpiringSoon({ access_token: "abc", expires_at: pastExpiry }),
      ).toBe(true);
    });
  });

  describe("refreshOAuthTokenIfNeeded", () => {
    const serverUrl = "https://api.figma.com/mcp";

    test("期限に余裕がある場合は null を返す（リフレッシュ不要）", async () => {
      const credentials = {
        access_token: "valid-token",
        refresh_token: "rt",
        expires_at: String(Math.floor(Date.now() / 1000) + 3600),
      };

      const result = await refreshOAuthTokenIfNeeded(1, serverUrl, credentials);

      expect(result).toBeNull();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    test("refresh_token がない場合は null を返す", async () => {
      const credentials = {
        access_token: "expired-token",
        expires_at: String(Math.floor(Date.now() / 1000) - 100),
      };

      const result = await refreshOAuthTokenIfNeeded(1, serverUrl, credentials);

      expect(result).toBeNull();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    test("OAuthClient がDBに見つからない場合は null を返す", async () => {
      const credentials = {
        access_token: "expired-token",
        refresh_token: "rt",
        expires_at: String(Math.floor(Date.now() / 1000) - 100),
      };

      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue(null);

      const result = await refreshOAuthTokenIfNeeded(1, serverUrl, credentials);

      expect(result).toBeNull();
    });

    test("リフレッシュ成功時は新しいcredentialsを返しDBに保存する", async () => {
      const credentials = {
        access_token: "expired-token",
        refresh_token: "old-rt",
        expires_at: String(Math.floor(Date.now() / 1000) - 100),
      };

      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl,
        issuer: "https://www.figma.com",
        clientId: "client-id",
        clientSecret: "client-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify({
          issuer: "https://www.figma.com",
          authorization_endpoint: "https://www.figma.com/oauth",
          token_endpoint: "https://www.figma.com/api/oauth/token",
        }),
        isDcr: true,
      });

      const newExpiresAt = Math.floor(Date.now() / 1000) + 3600;
      vi.mocked(refreshAccessToken).mockResolvedValue({
        access_token: "new-access-token",
        token_type: "bearer",
        refresh_token: "new-rt",
        expires_at: newExpiresAt,
      });

      vi.mocked(oauthRepository.updateSecretCredentials).mockResolvedValue();

      const result = await refreshOAuthTokenIfNeeded(1, serverUrl, credentials);

      expect(result).toStrictEqual({
        access_token: "new-access-token",
        refresh_token: "new-rt",
        expires_at: String(newExpiresAt),
      });

      expect(encryptToken).toHaveBeenCalled();
      expect(oauthRepository.updateSecretCredentials).toHaveBeenCalledWith(
        mockDb,
        1,
        expect.stringContaining("encrypted:"),
      );
    });

    test("リフレッシュAPI呼び出しが失敗した場合は null を返す", async () => {
      const credentials = {
        access_token: "expired-token",
        refresh_token: "old-rt",
        expires_at: String(Math.floor(Date.now() / 1000) - 100),
      };

      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl,
        issuer: "https://www.figma.com",
        clientId: "client-id",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        authServerMetadata: JSON.stringify({
          issuer: "https://www.figma.com",
          authorization_endpoint: "https://www.figma.com/oauth",
          token_endpoint: "https://www.figma.com/api/oauth/token",
        }),
        isDcr: true,
      });

      vi.mocked(refreshAccessToken).mockRejectedValue(
        new Error("invalid_grant"),
      );

      const result = await refreshOAuthTokenIfNeeded(1, serverUrl, credentials);

      expect(result).toBeNull();
    });

    test("authServerMetadata が不正な場合は null を返す", async () => {
      const credentials = {
        access_token: "expired-token",
        refresh_token: "old-rt",
        expires_at: String(Math.floor(Date.now() / 1000) - 100),
      };

      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl,
        issuer: "https://www.figma.com",
        clientId: "client-id",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        authServerMetadata: "{}",
        isDcr: true,
      });

      const result = await refreshOAuthTokenIfNeeded(1, serverUrl, credentials);

      expect(result).toBeNull();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe("refreshOAuthTokenIfNeededOnce", () => {
    test("同一 secretId の並行呼び出しは1回だけリフレッシュする", async () => {
      const credentials = {
        access_token: "expired-token",
        refresh_token: "old-rt",
        expires_at: String(Math.floor(Date.now() / 1000) - 100),
      };

      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://api.example.com",
        issuer: "https://example.com",
        clientId: "cid",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        authServerMetadata: JSON.stringify({
          issuer: "https://example.com",
          authorization_endpoint: "https://example.com/auth",
          token_endpoint: "https://example.com/token",
        }),
        isDcr: true,
      });

      const newExpiresAt = Math.floor(Date.now() / 1000) + 3600;
      vi.mocked(refreshAccessToken).mockResolvedValue({
        access_token: "new-token",
        token_type: "bearer",
        refresh_token: "new-rt",
        expires_at: newExpiresAt,
      });
      vi.mocked(oauthRepository.updateSecretCredentials).mockResolvedValue();

      // 同一 secretId=99 で並行3件
      const [r1, r2, r3] = await Promise.all([
        refreshOAuthTokenIfNeededOnce(
          99,
          "https://api.example.com",
          credentials,
        ),
        refreshOAuthTokenIfNeededOnce(
          99,
          "https://api.example.com",
          credentials,
        ),
        refreshOAuthTokenIfNeededOnce(
          99,
          "https://api.example.com",
          credentials,
        ),
      ]);

      expect(r1).toStrictEqual(r2);
      expect(r2).toStrictEqual(r3);
      // refreshAccessToken は1回だけ呼ばれる
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("resolveOAuthHeaders", () => {
    test("有効なトークンがある場合は Authorization ヘッダーを返す", async () => {
      const credentials = {
        access_token: "valid-token",
        expires_at: String(Math.floor(Date.now() / 1000) + 3600),
      };

      const mockFindUnique = vi.fn().mockResolvedValue({
        credentials: "encrypted-creds",
      });
      vi.mocked(getDb).mockResolvedValue({
        mcpSecret: { findUnique: mockFindUnique },
      } as unknown as Awaited<ReturnType<typeof getDb>>);
      vi.mocked(decryptCredentials).mockResolvedValue(
        JSON.stringify(credentials),
      );

      const headers = await resolveOAuthHeaders(1, "https://api.example.com");

      expect(headers).toStrictEqual({
        Authorization: "Bearer valid-token",
      });
    });

    test("McpSecret が見つからない場合は空オブジェクトを返す", async () => {
      const mockFindUnique = vi.fn().mockResolvedValue(null);
      vi.mocked(getDb).mockResolvedValue({
        mcpSecret: { findUnique: mockFindUnique },
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const headers = await resolveOAuthHeaders(999, "https://api.example.com");

      expect(headers).toStrictEqual({});
    });
  });
});
