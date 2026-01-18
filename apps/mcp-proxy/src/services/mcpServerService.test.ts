/**
 * mcpServerService.ts のテスト
 *
 * McpServer検索サービスのテストを実施
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted を使用してホイスティング問題を解決
const {
  mockMcpServerFindUnique,
  mockOrganizationMemberFindUnique,
  mockAccountFindFirst,
  mockGetRedisClient,
} = vi.hoisted(() => ({
  mockMcpServerFindUnique: vi.fn(),
  mockOrganizationMemberFindUnique: vi.fn(),
  mockAccountFindFirst: vi.fn(),
  mockGetRedisClient: vi.fn(),
}));

vi.mock("@tumiki/db/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...actual,
    db: {
      mcpServer: {
        findUnique: mockMcpServerFindUnique,
      },
      organizationMember: {
        findUnique: mockOrganizationMemberFindUnique,
      },
      account: {
        findFirst: mockAccountFindFirst,
      },
    },
  };
});

vi.mock("../libs/cache/redis.js", () => ({
  getRedisClient: mockGetRedisClient,
}));

vi.mock("../libs/logger/index.js", () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// PiiMaskingMode をインポート
import { PiiMaskingMode } from "@tumiki/db/server";

// モック設定後にインポート
import {
  getMcpServerOrganization,
  invalidateMcpServerCache,
  checkOrganizationMembership,
  invalidateOrganizationMembershipCache,
  getUserIdFromKeycloakId,
  invalidateKeycloakUserCache,
} from "./mcpServerService.js";

// エイリアスを作成（既存テストとの互換性のため）
const mockFindUnique = mockMcpServerFindUnique;

describe("mcpServerService", () => {
  describe("getMcpServerOrganization", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    test("存在するMcpServerのorganizationIdを返す", async () => {
      const mockMcpServer = {
        id: "test-server-id",
        name: "Test Server",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "OAUTH" as const,
        serverType: "CUSTOM" as const,
        piiMaskingMode: PiiMaskingMode.DISABLED,
        piiInfoTypes: [] as string[],
        toonConversionEnabled: false,
      };

      mockGetRedisClient.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("test-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-server-id" },
        select: {
          id: true,
          name: true,
          organizationId: true,
          deletedAt: true,
          authType: true,
          serverType: true,
          piiMaskingMode: true,
          piiInfoTypes: true,
          toonConversionEnabled: true,
        },
      });
    });

    test("存在しないMcpServerの場合はnullを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(null);

      const result = await getMcpServerOrganization("non-existent-id");

      expect(result).toBeNull();
    });

    test("削除されたMcpServerの場合もデータを返す（deletedAtを含む）", async () => {
      const deletedAt = new Date("2024-01-01");
      const mockMcpServer = {
        id: "deleted-server-id",
        name: "Deleted Server",
        organizationId: "test-org-id",
        deletedAt,
        authType: "API_KEY" as const,
        serverType: "CUSTOM" as const,
        piiMaskingMode: PiiMaskingMode.DISABLED,
        piiInfoTypes: [] as string[],
        toonConversionEnabled: false,
      };

      mockGetRedisClient.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("deleted-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(result?.deletedAt).toStrictEqual(deletedAt);
    });

    test("Redisキャッシュからデータを取得する", async () => {
      const cachedData = {
        id: "cached-server-id",
        name: "Cached Server",
        organizationId: "cached-org-id",
        deletedAt: null,
        authType: "OAUTH" as const,
        serverType: "CUSTOM" as const,
        piiMaskingMode: PiiMaskingMode.DISABLED,
        piiInfoTypes: [] as string[],
        toonConversionEnabled: false,
      };
      const mockRedis = {
        get: vi.fn().mockResolvedValue(JSON.stringify(cachedData)),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getMcpServerOrganization("cached-server-id");

      expect(result).toStrictEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        "mcpserver:org:cached-server-id",
      );
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBからフェッチしてキャッシュする", async () => {
      const mockMcpServer = {
        id: "test-server-id",
        name: "Test Server",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "OAUTH" as const,
        serverType: "CUSTOM" as const,
        piiMaskingMode: PiiMaskingMode.DISABLED,
        piiInfoTypes: [] as string[],
        toonConversionEnabled: false,
      };
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("test-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockFindUnique).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "mcpserver:org:test-server-id",
        300,
        JSON.stringify({
          id: "test-server-id",
          name: "Test Server",
          organizationId: "test-org-id",
          deletedAt: null,
          authType: "OAUTH",
          serverType: "CUSTOM",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        }),
      );
    });

    test("ネガティブキャッシュ: 存在しないMcpServerもキャッシュされる", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockFindUnique.mockResolvedValue(null);

      const result = await getMcpServerOrganization("non-existent-id");

      expect(result).toBeNull();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "mcpserver:org:non-existent-id",
        300,
        "null",
      );
    });

    test("ネガティブキャッシュからnullを読み取る", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("null"),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getMcpServerOrganization("cached-null-id");

      expect(result).toBeNull();
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

      await expect(getMcpServerOrganization("test-server-id")).rejects.toThrow(
        "DB connection failed",
      );
    });

    test("Redisエラー時はDBにフォールバックする", async () => {
      const mockMcpServer = {
        id: "test-server-id",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "OAUTH" as const,
        piiMaskingMode: PiiMaskingMode.DISABLED,
        piiInfoTypes: [] as string[],
        toonConversionEnabled: false,
      };
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("test-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockFindUnique).toHaveBeenCalled();
    });
  });

  describe("invalidateMcpServerCache", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = {
        get: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      await invalidateMcpServerCache("test-server-id");

      expect(mockRedis.del).toHaveBeenCalledWith(
        "mcpserver:org:test-server-id",
      );
    });

    test("Redisが利用不可の場合はスキップする", async () => {
      mockGetRedisClient.mockResolvedValue(null);

      // エラーなく完了することを確認
      await expect(
        invalidateMcpServerCache("test-server-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("checkOrganizationMembership", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    test("組織のメンバーである場合はtrueを返す", async () => {
      const mockMember = {
        id: "member-id",
      };

      mockGetRedisClient.mockResolvedValue(null);
      mockOrganizationMemberFindUnique.mockResolvedValue(mockMember);

      const result = await checkOrganizationMembership(
        "test-org-id",
        "test-user-id",
      );

      expect(result).toBe(true);
      expect(mockOrganizationMemberFindUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: "test-org-id",
            userId: "test-user-id",
          },
        },
        select: { id: true },
      });
    });

    test("組織のメンバーでない場合はfalseを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockOrganizationMemberFindUnique.mockResolvedValue(null);

      const result = await checkOrganizationMembership(
        "test-org-id",
        "non-member-user-id",
      );

      expect(result).toBe(false);
    });

    test("キャッシュからメンバーシップを取得する（メンバーの場合）", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("true"),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await checkOrganizationMembership(
        "cached-org-id",
        "cached-user-id",
      );

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        "orgmember:cached-org-id:cached-user-id",
      );
      expect(mockOrganizationMemberFindUnique).not.toHaveBeenCalled();
    });

    test("キャッシュからメンバーシップを取得する（非メンバーの場合）", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("false"),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await checkOrganizationMembership(
        "cached-org-id",
        "cached-user-id",
      );

      expect(result).toBe(false);
      expect(mockOrganizationMemberFindUnique).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBから確認してキャッシュする（メンバーの場合）", async () => {
      const mockMember = { id: "member-id" };
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockOrganizationMemberFindUnique.mockResolvedValue(mockMember);

      const result = await checkOrganizationMembership(
        "test-org-id",
        "test-user-id",
      );

      expect(result).toBe(true);
      expect(mockOrganizationMemberFindUnique).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "orgmember:test-org-id:test-user-id",
        300,
        "true",
      );
    });

    test("キャッシュミス時はDBから確認してキャッシュする（非メンバーの場合）", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockOrganizationMemberFindUnique.mockResolvedValue(null);

      const result = await checkOrganizationMembership(
        "test-org-id",
        "non-member-id",
      );

      expect(result).toBe(false);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "orgmember:test-org-id:non-member-id",
        300,
        "false",
      );
    });

    test("Redisエラー時はDBにフォールバックする", async () => {
      const mockMember = { id: "member-id" };
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockOrganizationMemberFindUnique.mockResolvedValue(mockMember);

      const result = await checkOrganizationMembership(
        "test-org-id",
        "test-user-id",
      );

      expect(result).toBe(true);
      expect(mockOrganizationMemberFindUnique).toHaveBeenCalled();
    });
  });

  describe("invalidateOrganizationMembershipCache", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = {
        get: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      await invalidateOrganizationMembershipCache(
        "test-org-id",
        "test-user-id",
      );

      expect(mockRedis.del).toHaveBeenCalledWith(
        "orgmember:test-org-id:test-user-id",
      );
    });

    test("Redisが利用不可の場合はスキップする", async () => {
      mockGetRedisClient.mockResolvedValue(null);

      // エラーなく完了することを確認
      await expect(
        invalidateOrganizationMembershipCache("test-org-id", "test-user-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("getUserIdFromKeycloakId", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    test("Keycloak IDに対応するUser IDを返す", async () => {
      const mockAccount = {
        userId: "tumiki-user-id",
      };

      mockGetRedisClient.mockResolvedValue(null);
      mockAccountFindFirst.mockResolvedValue(mockAccount);

      const result = await getUserIdFromKeycloakId("keycloak-sub-123");

      expect(result).toBe("tumiki-user-id");
      expect(mockAccountFindFirst).toHaveBeenCalledWith({
        where: {
          provider: "keycloak",
          providerAccountId: "keycloak-sub-123",
        },
        select: { userId: true },
      });
    });

    test("存在しないKeycloak IDの場合はnullを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockAccountFindFirst.mockResolvedValue(null);

      const result = await getUserIdFromKeycloakId("non-existent-keycloak-id");

      expect(result).toBeNull();
    });

    test("Redisキャッシュからデータを取得する", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("cached-user-id"),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getUserIdFromKeycloakId("cached-keycloak-id");

      expect(result).toBe("cached-user-id");
      expect(mockRedis.get).toHaveBeenCalledWith(
        "keycloak:user:cached-keycloak-id",
      );
      expect(mockAccountFindFirst).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBからフェッチしてキャッシュする", async () => {
      const mockAccount = {
        userId: "tumiki-user-id",
      };
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockAccountFindFirst.mockResolvedValue(mockAccount);

      const result = await getUserIdFromKeycloakId("keycloak-sub-123");

      expect(result).toBe("tumiki-user-id");
      expect(mockAccountFindFirst).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "keycloak:user:keycloak-sub-123",
        300,
        "tumiki-user-id",
      );
    });

    test("ネガティブキャッシュ: 存在しないKeycloak IDもキャッシュされる", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockAccountFindFirst.mockResolvedValue(null);

      const result = await getUserIdFromKeycloakId("non-existent-keycloak-id");

      expect(result).toBeNull();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "keycloak:user:non-existent-keycloak-id",
        300,
        "null",
      );
    });

    test("ネガティブキャッシュからnullを読み取る", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("null"),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getUserIdFromKeycloakId("cached-null-keycloak-id");

      expect(result).toBeNull();
      expect(mockAccountFindFirst).not.toHaveBeenCalled();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockAccountFindFirst.mockRejectedValue(new Error("DB connection failed"));

      await expect(getUserIdFromKeycloakId("keycloak-sub-123")).rejects.toThrow(
        "DB connection failed",
      );
    });

    test("Redisエラー時はDBにフォールバックする", async () => {
      const mockAccount = {
        userId: "tumiki-user-id",
      };
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
        setEx: vi.fn(),
        del: vi.fn(),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockAccountFindFirst.mockResolvedValue(mockAccount);

      const result = await getUserIdFromKeycloakId("keycloak-sub-123");

      expect(result).toBe("tumiki-user-id");
      expect(mockAccountFindFirst).toHaveBeenCalled();
    });
  });

  describe("invalidateKeycloakUserCache", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = {
        get: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
      };

      mockGetRedisClient.mockResolvedValue(mockRedis);

      await invalidateKeycloakUserCache("keycloak-sub-123");

      expect(mockRedis.del).toHaveBeenCalledWith(
        "keycloak:user:keycloak-sub-123",
      );
    });

    test("Redisが利用不可の場合はスキップする", async () => {
      mockGetRedisClient.mockResolvedValue(null);

      // エラーなく完了することを確認
      await expect(
        invalidateKeycloakUserCache("keycloak-sub-123"),
      ).resolves.not.toThrow();
    });
  });
});
