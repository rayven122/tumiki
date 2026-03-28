import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../utils/logger");

import { createKeycloakClient } from "../keycloak";
import type { KeycloakConfig } from "../keycloak";

const createConfig = (
  overrides: Partial<KeycloakConfig> = {},
): KeycloakConfig => ({
  issuer: "https://keycloak.example.com/realms/test",
  clientId: "test-client",
  redirectUri: "tumiki-desktop://auth/callback",
  ...overrides,
});

describe("KeycloakClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("createKeycloakClient", () => {
    test("有効な設定でインスタンスを作成できる", () => {
      const client = createKeycloakClient(createConfig());
      expect(client).toBeDefined();
    });

    test("issuerがURLでない場合はエラーをスローする", () => {
      expect(() =>
        createKeycloakClient(createConfig({ issuer: "invalid" })),
      ).toThrow();
    });

    test("clientIdが空の場合はエラーをスローする", () => {
      expect(() =>
        createKeycloakClient(createConfig({ clientId: "" })),
      ).toThrow();
    });
  });

  describe("generateAuthUrl", () => {
    test("正しいOAuth認証URLを生成する", () => {
      const client = createKeycloakClient(createConfig());
      const url = client.generateAuthUrl({
        codeChallenge: "test-challenge",
        state: "test-state",
      });

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "https://keycloak.example.com/realms/test/protocol/openid-connect/auth",
      );
      expect(parsed.searchParams.get("client_id")).toBe("test-client");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "tumiki-desktop://auth/callback",
      );
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("scope")).toBe("openid profile email");
      expect(parsed.searchParams.get("state")).toBe("test-state");
      expect(parsed.searchParams.get("code_challenge")).toBe("test-challenge");
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    });
  });

  describe("exchangeCodeForToken", () => {
    test("認可コードをトークンに交換できる", async () => {
      const mockResponse = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 300,
        token_type: "Bearer",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const client = createKeycloakClient(createConfig());
      const result = await client.exchangeCodeForToken({
        code: "auth-code",
        codeVerifier: "verifier",
      });

      expect(result).toStrictEqual(mockResponse);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[0]).toBe(
        "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      );
      const body = fetchCall?.[1]?.body as URLSearchParams;
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("auth-code");
      expect(body.get("code_verifier")).toBe("verifier");
    });

    test("レスポンスがJSONでない場合はレスポンス解析エラーをスローする", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError("Unexpected token <")),
        }),
      );

      const client = createKeycloakClient(createConfig());

      await expect(
        client.exchangeCodeForToken({
          code: "auth-code",
          codeVerifier: "verifier",
        }),
      ).rejects.toThrow(
        "トークン取得に失敗しました（レスポンス解析エラー: 200）",
      );
    });

    test("トークン取得に失敗した場合はエラーをスローする", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve("invalid_grant"),
        }),
      );

      const client = createKeycloakClient(createConfig());

      await expect(
        client.exchangeCodeForToken({
          code: "invalid-code",
          codeVerifier: "verifier",
        }),
      ).rejects.toThrow("トークン取得に失敗しました");
    });
  });

  describe("refreshToken", () => {
    test("リフレッシュトークンでアクセストークンを更新できる", async () => {
      const mockResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 300,
        token_type: "Bearer",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const client = createKeycloakClient(createConfig());
      const result = await client.refreshToken("old-refresh-token");

      expect(result).toStrictEqual(mockResponse);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall?.[1]?.body as URLSearchParams;
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("old-refresh-token");
    });

    test("リフレッシュレスポンスがJSONでない場合はレスポンス解析エラーをスローする", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError("Unexpected token <")),
        }),
      );

      const client = createKeycloakClient(createConfig());

      await expect(client.refreshToken("refresh-token")).rejects.toThrow(
        "トークンリフレッシュに失敗しました（レスポンス解析エラー: 200）",
      );
    });

    test("リフレッシュに失敗した場合はエラーをスローする", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve("invalid_grant"),
        }),
      );

      const client = createKeycloakClient(createConfig());

      await expect(
        client.refreshToken("expired-refresh-token"),
      ).rejects.toThrow("トークンリフレッシュに失敗しました");
    });
  });

  describe("logout", () => {
    test("Keycloakからログアウトできる", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

      const client = createKeycloakClient(createConfig());
      await client.logout({ refreshToken: "refresh-token" });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall?.[0]).toBe(
        "https://keycloak.example.com/realms/test/protocol/openid-connect/logout",
      );
    });

    test("ログアウトリクエストが失敗してもエラーをスローしない", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve("server error"),
        }),
      );

      const client = createKeycloakClient(createConfig());
      // エラーなしで完了すればOK
      await client.logout({ refreshToken: "refresh-token" });
    });

    test("ネットワークエラーでもエラーをスローしない", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );

      const client = createKeycloakClient(createConfig());
      // エラーなしで完了すればOK
      await client.logout({ refreshToken: "refresh-token" });
    });

    test("TypeErrorはプログラミングエラーとして再スローする", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("Invalid URL")),
      );

      const client = createKeycloakClient(createConfig());
      await expect(
        client.logout({ refreshToken: "refresh-token" }),
      ).rejects.toThrow(TypeError);
    });

    test("リクエストボディにclient_idとrefresh_tokenが含まれる", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

      const client = createKeycloakClient(createConfig());
      await client.logout({
        refreshToken: "refresh-token",
        idToken: "id-token",
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = fetchCall?.[1]?.body as URLSearchParams;
      expect(body.get("client_id")).toBe("test-client");
      expect(body.get("refresh_token")).toBe("refresh-token");
      expect(body.get("id_token_hint")).toBe("id-token");
    });
  });
});
