import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpConfig, McpServerTemplate } from "@tumiki/db/prisma";

// @tumiki/oauth-token-manager のモック
vi.mock("@tumiki/oauth-token-manager", () => ({
  getValidToken: vi.fn(),
  ReAuthRequiredError: class ReAuthRequiredError extends Error {
    tokenId: string;
    userId: string;
    mcpServerId: string;
    constructor(
      message: string,
      tokenId: string,
      userId: string,
      mcpServerId: string,
    ) {
      super(message);
      this.name = "ReAuthRequiredError";
      this.tokenId = tokenId;
      this.userId = userId;
      this.mcpServerId = mcpServerId;
    }
  },
}));

// cloudRunAuth のモック
vi.mock("../cloudRunAuth.js", () => ({
  getCloudRunIdToken: vi.fn(),
}));

// logger のモック
vi.mock("../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
}));

import { injectAuthHeaders } from "../authHeaderInjector.js";
import {
  getValidToken,
  ReAuthRequiredError,
} from "@tumiki/oauth-token-manager";
import { getCloudRunIdToken } from "../cloudRunAuth.js";
import { logError } from "../../../shared/logger/index.js";

// モック関数を取得
const mockGetValidToken = vi.mocked(getValidToken);
const mockGetCloudRunIdToken = vi.mocked(getCloudRunIdToken);

// テスト用のベーステンプレート生成ヘルパー
const createMockTemplate = (
  overrides: Partial<McpServerTemplate> = {},
): McpServerTemplate =>
  ({
    id: "template-1",
    name: "Test Template",
    slug: "test-template",
    transportType: "STREAMABLE_HTTPS",
    authType: "OAUTH",
    url: "https://mcp.example.com",
    useCloudRunIam: false,
    envVarKeys: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as McpServerTemplate;

// テスト用のMcpConfig生成ヘルパー
const createMockConfig = (overrides: Partial<McpConfig> = {}): McpConfig =>
  ({
    id: "config-1",
    mcpServerTemplateInstanceId: "instance-1",
    envVars: JSON.stringify({}),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as McpConfig;

describe("injectAuthHeaders", () => {
  const userId = "user-123";
  const instanceId = "instance-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("AuthType.NONE", () => {
    test("空のヘッダーオブジェクトを返す", async () => {
      const template = createMockTemplate({ authType: "NONE" });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        null,
      );

      expect(result).toStrictEqual({});
      expect(mockGetValidToken).not.toHaveBeenCalled();
      expect(mockGetCloudRunIdToken).not.toHaveBeenCalled();
    });

    test("mcpConfigがあっても空のヘッダーを返す", async () => {
      const template = createMockTemplate({ authType: "NONE" });
      const config = createMockConfig();

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        config,
      );

      expect(result).toStrictEqual({});
    });
  });

  describe("AuthType.OAUTH", () => {
    test("OAuthトークンをAuthorizationヘッダーに設定する", async () => {
      const template = createMockTemplate({ authType: "OAUTH" });
      mockGetValidToken.mockResolvedValue({
        id: "token-1",
        accessToken: "oauth-access-token-123",
        refreshToken: null,
        expiresAt: null,
        oauthClientId: "client-1",
      });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        null,
      );

      expect(result).toStrictEqual({
        Authorization: "Bearer oauth-access-token-123",
      });
      expect(mockGetValidToken).toHaveBeenCalledWith(instanceId, userId);
    });

    test("mcpConfigのenvVarsからカスタムヘッダーを追加する", async () => {
      const template = createMockTemplate({
        authType: "OAUTH",
        envVarKeys: ["X-Custom-API-Key", "X-Another-Header"],
      });
      const config = createMockConfig({
        envVars: JSON.stringify({
          "X-Custom-API-Key": "custom-key-value",
          "X-Another-Header": "another-value",
        }),
      });
      mockGetValidToken.mockResolvedValue({
        id: "token-1",
        accessToken: "oauth-token",
        refreshToken: null,
        expiresAt: null,
        oauthClientId: "client-1",
      });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        config,
      );

      expect(result).toStrictEqual({
        Authorization: "Bearer oauth-token",
        "X-Custom-API-Key": "custom-key-value",
        "X-Another-Header": "another-value",
      });
    });

    test("envVarKeysに存在しないキーは無視する", async () => {
      const template = createMockTemplate({
        authType: "OAUTH",
        envVarKeys: ["X-Defined-Key"],
      });
      const config = createMockConfig({
        envVars: JSON.stringify({
          "X-Defined-Key": "value",
          "X-Undefined-Key": "should-be-ignored",
        }),
      });
      mockGetValidToken.mockResolvedValue({
        id: "token-1",
        accessToken: "oauth-token",
        refreshToken: null,
        expiresAt: null,
        oauthClientId: "client-1",
      });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        config,
      );

      expect(result).toStrictEqual({
        Authorization: "Bearer oauth-token",
        "X-Defined-Key": "value",
      });
      expect(result).not.toHaveProperty("X-Undefined-Key");
    });

    test("ReAuthRequiredErrorはそのまま伝播する", async () => {
      const template = createMockTemplate({ authType: "OAUTH" });
      mockGetValidToken.mockRejectedValue(
        new ReAuthRequiredError(
          "Re-authentication required",
          "token-123",
          userId,
          "mcp-server-123",
        ),
      );

      await expect(
        injectAuthHeaders(template, userId, instanceId, null),
      ).rejects.toThrow(ReAuthRequiredError);
    });

    test("その他のエラーはラップして伝播する", async () => {
      const template = createMockTemplate({ authType: "OAUTH" });
      mockGetValidToken.mockRejectedValue(new Error("Token fetch failed"));

      await expect(
        injectAuthHeaders(template, userId, instanceId, null),
      ).rejects.toThrow("Failed to inject OAuth headers: Token fetch failed");

      expect(logError).toHaveBeenCalledWith(
        "Failed to inject OAuth headers",
        expect.any(Error),
      );
    });

    test("Error以外のオブジェクトがスローされた場合はUnknown errorメッセージで伝播する", async () => {
      const template = createMockTemplate({ authType: "OAUTH" });
      mockGetValidToken.mockRejectedValue("string error");

      await expect(
        injectAuthHeaders(template, userId, instanceId, null),
      ).rejects.toThrow("Failed to inject OAuth headers: Unknown error");
    });
  });

  describe("AuthType.API_KEY", () => {
    test("mcpConfigがない場合は空のヘッダーを返す", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: false,
      });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        null,
      );

      expect(result).toStrictEqual({});
    });

    test("mcpConfigのenvVarsからカスタムヘッダーを設定する", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: false,
        envVarKeys: ["Tumiki-API-Key"],
      });
      const config = createMockConfig({
        envVars: JSON.stringify({
          "Tumiki-API-Key": "api-key-12345",
        }),
      });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        config,
      );

      expect(result).toStrictEqual({
        "Tumiki-API-Key": "api-key-12345",
      });
    });

    test("Cloud Run IAM認証が有効な場合はIDトークンを追加する", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: true,
        url: "https://cloudrun.example.com",
      });
      mockGetCloudRunIdToken.mockResolvedValue("cloud-run-id-token");

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        null,
      );

      expect(result).toStrictEqual({
        Authorization: "Bearer cloud-run-id-token",
      });
      expect(mockGetCloudRunIdToken).toHaveBeenCalledWith(
        "https://cloudrun.example.com",
      );
    });

    test("Cloud Run IAM認証とカスタムヘッダーを両方設定する", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: true,
        url: "https://cloudrun.example.com",
        envVarKeys: ["X-API-Key"],
      });
      const config = createMockConfig({
        envVars: JSON.stringify({
          "X-API-Key": "my-api-key",
        }),
      });
      mockGetCloudRunIdToken.mockResolvedValue("cloud-run-token");

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        config,
      );

      expect(result).toStrictEqual({
        Authorization: "Bearer cloud-run-token",
        "X-API-Key": "my-api-key",
      });
    });

    test("Cloud Run IAM認証でURLがない場合はスキップする", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: true,
        url: null,
      });

      const result = await injectAuthHeaders(
        template,
        userId,
        instanceId,
        null,
      );

      expect(result).toStrictEqual({});
      expect(mockGetCloudRunIdToken).not.toHaveBeenCalled();
    });

    test("Cloud Runトークン取得エラーはラップして伝播する", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: true,
        url: "https://cloudrun.example.com",
      });
      mockGetCloudRunIdToken.mockRejectedValue(
        new Error("Cloud Run auth failed"),
      );

      await expect(
        injectAuthHeaders(template, userId, instanceId, null),
      ).rejects.toThrow(
        "Failed to inject API key headers: Cloud Run auth failed",
      );

      expect(logError).toHaveBeenCalledWith(
        "Failed to inject API key headers",
        expect.any(Error),
      );
    });

    test("Error以外のオブジェクトがスローされた場合はUnknown errorメッセージで伝播する", async () => {
      const template = createMockTemplate({
        authType: "API_KEY",
        useCloudRunIam: true,
        url: "https://cloudrun.example.com",
      });
      mockGetCloudRunIdToken.mockRejectedValue("non-error value");

      await expect(
        injectAuthHeaders(template, userId, instanceId, null),
      ).rejects.toThrow("Failed to inject API key headers: Unknown error");
    });
  });

  describe("不明なauthType", () => {
    test("不明な認証タイプの場合はエラーをスローする", async () => {
      const template = createMockTemplate({
        authType: "UNKNOWN_TYPE" as McpServerTemplate["authType"],
      });

      await expect(
        injectAuthHeaders(template, userId, instanceId, null),
      ).rejects.toThrow("Unknown auth type: UNKNOWN_TYPE");
    });
  });
});
