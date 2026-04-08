import { describe, test, expect, vi, beforeEach } from "vitest";

// モック設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
  },
}));
vi.mock("../../../shared/utils/logger");
vi.mock("oauth4webapi", () => ({
  discoveryRequest: vi.fn(),
  processDiscoveryResponse: vi.fn(),
}));

import * as oauth from "oauth4webapi";
import {
  discoverOAuthMetadata,
  issuerUrlsToTry,
  normalizeUrl,
  DiscoveryError,
} from "../oauth.discovery";

// グローバルfetchをモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("oauth.discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeUrl", () => {
    test("末尾スラッシュを削除する", () => {
      const result = normalizeUrl("https://example.com/mcp/");
      expect(result.toString()).toBe("https://example.com/mcp");
    });

    test("クエリパラメータを削除する", () => {
      const result = normalizeUrl("https://example.com/mcp?key=value");
      expect(result.toString()).toBe("https://example.com/mcp");
    });

    test("フラグメントを削除する", () => {
      const result = normalizeUrl("https://example.com/mcp#section");
      expect(result.toString()).toBe("https://example.com/mcp");
    });

    test("ルートパスの末尾スラッシュは保持する", () => {
      const result = normalizeUrl("https://example.com/");
      expect(result.pathname).toBe("/");
    });
  });

  describe("issuerUrlsToTry", () => {
    test("RFC 9728 の hint と resource パスがあるとき AS とパス付きの順で試す", () => {
      expect(
        issuerUrlsToTry({
          authorizationServerHint: "https://auth.example.com",
          resourcePath: "/mcp",
          serverUrl: "https://mcp.example.com/mcp",
          origin: "https://mcp.example.com",
        }),
      ).toEqual(["https://auth.example.com", "https://auth.example.com/mcp"]);
    });

    test("hint のみ（ルート PRM）のときは hint だけ試す", () => {
      expect(
        issuerUrlsToTry({
          authorizationServerHint: "https://auth.example.com",
          resourcePath: "",
          serverUrl: "https://example.com/",
          origin: "https://example.com",
        }),
      ).toEqual(["https://auth.example.com"]);
    });

    test("hint がないときパス付き MCP は serverUrl → origin の順", () => {
      expect(
        issuerUrlsToTry({
          authorizationServerHint: null,
          resourcePath: "/mcp",
          serverUrl: "https://example.com/mcp",
          origin: "https://example.com",
        }),
      ).toEqual(["https://example.com/mcp", "https://example.com"]);
    });

    test("hint がなくパスもルートのみのときは origin のみ", () => {
      expect(
        issuerUrlsToTry({
          authorizationServerHint: null,
          resourcePath: "",
          serverUrl: "https://example.com/",
          origin: "https://example.com",
        }),
      ).toEqual(["https://example.com"]);
    });
  });

  describe("discoverOAuthMetadata", () => {
    const mockMetadata: oauth.AuthorizationServer = {
      issuer: "https://www.figma.com",
      authorization_endpoint: "https://www.figma.com/oauth",
      token_endpoint: "https://www.figma.com/api/oauth/token",
      registration_endpoint: "https://www.figma.com/api/oauth/register",
    };

    test("RFC 9728 + RFC 8414 の正常ルートでメタデータを取得する", async () => {
      // Step 1: Protected Resource Metadata 成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authorization_servers: ["https://www.figma.com"],
        }),
      });

      // Step 2: AS Metadata 成功
      // normalizeUrl("https://www.figma.com").toString() = "https://www.figma.com/"
      // issuer "https://www.figma.com" と末尾スラッシュ差異でリトライが走る
      const mockResponse = {
        ok: true,
        clone: () => ({
          json: async () => mockMetadata,
        }),
      };
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce(
        mockResponse as unknown as Response,
      );
      // 末尾スラッシュ差異のリトライ用モック
      const retryResponse = {
        ok: true,
        clone: () => ({
          json: async () => mockMetadata,
        }),
      };
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce(
        retryResponse as unknown as Response,
      );
      vi.mocked(oauth.processDiscoveryResponse).mockResolvedValueOnce(
        mockMetadata,
      );

      const result = await discoverOAuthMetadata("https://mcp.figma.com/mcp");

      // Protected Resource Metadata のURL構築を検証
      expect(mockFetch).toHaveBeenCalledWith(
        "https://mcp.figma.com/.well-known/oauth-protected-resource/mcp",
        { headers: { Accept: "application/json" } },
      );

      // AS DiscoveryのURLを検証（AS URLから）
      expect(oauth.discoveryRequest).toHaveBeenCalledWith(
        expect.objectContaining({ origin: "https://www.figma.com" }),
        { algorithm: "oauth2" },
      );

      expect(result).toStrictEqual(mockMetadata);
    });

    test("RFC 9728非対応時にフォールバックでメタデータを取得する", async () => {
      // Step 1: Protected Resource Metadata 404
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      // Step 3: フォールバック - サーバーURLで直接試行
      const mockResponse = {
        ok: true,
        clone: () => ({
          json: async () => ({
            ...mockMetadata,
            issuer: "https://example.com",
          }),
        }),
      };
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce(
        mockResponse as unknown as Response,
      );
      vi.mocked(oauth.processDiscoveryResponse).mockResolvedValueOnce({
        ...mockMetadata,
        issuer: "https://example.com",
      });

      const result = await discoverOAuthMetadata("https://example.com/mcp");

      // サーバーURLで直接試行していることを検証
      expect(oauth.discoveryRequest).toHaveBeenCalledWith(
        expect.objectContaining({ origin: "https://example.com" }),
        { algorithm: "oauth2" },
      );
      expect(result.issuer).toBe("https://example.com");
    });

    test("issuerのoriginが不一致でも警告を出してメタデータを返す", async () => {
      // Step 1: Protected Resource Metadata 成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authorization_servers: ["https://auth.example.com"],
        }),
      });

      // Step 2: AS Metadata - issuerのoriginが異なる（CDNプロキシ等）
      const cdnMetadata = {
        ...mockMetadata,
        issuer: "https://cf.auth.example.com",
      };
      const mockResponse = {
        ok: true,
        clone: () => ({
          json: async () => cdnMetadata,
        }),
      };
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce(
        mockResponse as unknown as Response,
      );

      const result = await discoverOAuthMetadata("https://mcp.example.com/mcp");
      expect(result.issuer).toBe("https://cf.auth.example.com");
    });

    test("すべてのdiscovery試行が失敗した場合エラーをスローする", async () => {
      // Step 1: Protected Resource Metadata 失敗
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      // Step 3: フォールバックもすべて失敗
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as unknown as Response);
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as unknown as Response);

      await expect(
        discoverOAuthMetadata("https://example.com/mcp"),
      ).rejects.toThrow(DiscoveryError);
    });

    test("Protected Resource Metadataのネットワークエラーを許容する", async () => {
      // Step 1: ネットワークエラー
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

      // Step 3: フォールバックで成功
      const mockResponse = {
        ok: true,
        clone: () => ({
          json: async () => ({
            ...mockMetadata,
            issuer: "https://example.com",
          }),
        }),
      };
      vi.mocked(oauth.discoveryRequest).mockResolvedValueOnce(
        mockResponse as unknown as Response,
      );
      vi.mocked(oauth.processDiscoveryResponse).mockResolvedValueOnce({
        ...mockMetadata,
        issuer: "https://example.com",
      });

      const result = await discoverOAuthMetadata("https://example.com/mcp");
      expect(result).toBeDefined();
    });
  });
});
