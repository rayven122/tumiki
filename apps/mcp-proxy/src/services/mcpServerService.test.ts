/**
 * mcpServerService.ts のテスト
 *
 * McpServer検索サービスのテストを実施
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockMcpServerFindUnique,
  mockOrganizationMemberFindUnique,
  mockAccountFindFirst,
  mockUserFindFirst,
  mockTemplateInstanceFindUnique,
  mockGetRedisClient,
} = vi.hoisted(() => ({
  mockMcpServerFindUnique: vi.fn(),
  mockOrganizationMemberFindUnique: vi.fn(),
  mockAccountFindFirst: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockTemplateInstanceFindUnique: vi.fn(),
  mockGetRedisClient: vi.fn(),
}));

vi.mock("@tumiki/db/server", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...actual,
    db: {
      mcpServer: { findUnique: mockMcpServerFindUnique },
      organizationMember: { findUnique: mockOrganizationMemberFindUnique },
      account: { findFirst: mockAccountFindFirst },
      user: { findFirst: mockUserFindFirst },
      mcpServerTemplateInstance: { findUnique: mockTemplateInstanceFindUnique },
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

import {
  getMcpServerOrganization,
  invalidateMcpServerCache,
  checkOrganizationMembership,
  invalidateOrganizationMembershipCache,
  getUserIdFromKeycloakId,
  invalidateKeycloakUserCache,
  getUserIdByEmail,
  getTemplateInstanceById,
  invalidateTemplateInstanceCache,
} from "./mcpServerService.js";

// Redisモックの生成ヘルパー
type MockRedisOverrides = {
  get?: ReturnType<typeof vi.fn>;
  setEx?: ReturnType<typeof vi.fn>;
  del?: ReturnType<typeof vi.fn>;
};

const createMockRedis = (overrides: MockRedisOverrides = {}) => ({
  get: vi.fn().mockResolvedValue(null),
  setEx: vi.fn(),
  del: vi.fn(),
  ...overrides,
});

// McpServerデータの生成ヘルパー
const createMcpServerData = (overrides: Record<string, unknown> = {}) => ({
  id: "test-server-id",
  organizationId: "test-org-id",
  deletedAt: null,
  authType: "OAUTH" as const,
  piiMaskingMode: "DISABLED",
  piiInfoTypes: [] as string[],
  toonConversionEnabled: false,
  ...overrides,
});

describe("mcpServerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getMcpServerOrganization", () => {
    test("存在するMcpServerのorganizationIdを返す", async () => {
      const mockMcpServer = createMcpServerData();

      mockGetRedisClient.mockResolvedValue(null);
      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("test-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockMcpServerFindUnique).toHaveBeenCalledWith({
        where: { id: "test-server-id" },
        select: {
          id: true,
          organizationId: true,
          deletedAt: true,
          authType: true,
          piiMaskingMode: true,
          piiInfoTypes: true,
          toonConversionEnabled: true,
        },
      });
    });

    test("存在しないMcpServerの場合はnullを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockMcpServerFindUnique.mockResolvedValue(null);

      const result = await getMcpServerOrganization("non-existent-id");

      expect(result).toBeNull();
    });

    test("削除されたMcpServerの場合もデータを返す（deletedAtを含む）", async () => {
      const deletedAt = new Date("2024-01-01");
      const mockMcpServer = createMcpServerData({
        id: "deleted-server-id",
        deletedAt,
        authType: "API_KEY" as const,
      });

      mockGetRedisClient.mockResolvedValue(null);
      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("deleted-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(result?.deletedAt).toStrictEqual(deletedAt);
    });

    test("Redisキャッシュからデータを取得する", async () => {
      const cachedData = createMcpServerData({
        id: "cached-server-id",
        organizationId: "cached-org-id",
      });
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue(JSON.stringify(cachedData)),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getMcpServerOrganization("cached-server-id");

      expect(result).toStrictEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        "mcpserver:org:cached-server-id",
      );
      expect(mockMcpServerFindUnique).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBからフェッチしてキャッシュする", async () => {
      const mockMcpServer = createMcpServerData();
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("test-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockMcpServerFindUnique).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "mcpserver:org:test-server-id",
        300,
        JSON.stringify({
          id: "test-server-id",
          organizationId: "test-org-id",
          deletedAt: null,
          authType: "OAUTH",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        }),
      );
    });

    test("ネガティブキャッシュ: 存在しないMcpServerもキャッシュされる", async () => {
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockMcpServerFindUnique.mockResolvedValue(null);

      const result = await getMcpServerOrganization("non-existent-id");

      expect(result).toBeNull();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "mcpserver:org:non-existent-id",
        300,
        "null",
      );
    });

    test("ネガティブキャッシュからnullを読み取る", async () => {
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("null"),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getMcpServerOrganization("cached-null-id");

      expect(result).toBeNull();
      expect(mockMcpServerFindUnique).not.toHaveBeenCalled();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockMcpServerFindUnique.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(getMcpServerOrganization("test-server-id")).rejects.toThrow(
        "DB connection failed",
      );
    });

    test("Redisエラー時はDBにフォールバックする", async () => {
      const mockMcpServer = createMcpServerData();
      const mockRedis = createMockRedis({
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("test-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockMcpServerFindUnique).toHaveBeenCalled();
    });
  });

  describe("invalidateMcpServerCache", () => {
    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = createMockRedis({
        del: vi.fn().mockResolvedValue(1),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      await invalidateMcpServerCache("test-server-id");

      expect(mockRedis.del).toHaveBeenCalledWith(
        "mcpserver:org:test-server-id",
      );
    });

    test("Redisが利用不可の場合はスキップする", async () => {
      mockGetRedisClient.mockResolvedValue(null);

      await expect(
        invalidateMcpServerCache("test-server-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("checkOrganizationMembership", () => {
    test("組織のメンバーである場合はtrueを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockOrganizationMemberFindUnique.mockResolvedValue({ id: "member-id" });

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
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("true"),
      });

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
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("false"),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await checkOrganizationMembership(
        "cached-org-id",
        "cached-user-id",
      );

      expect(result).toBe(false);
      expect(mockOrganizationMemberFindUnique).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBから確認してキャッシュする（メンバーの場合）", async () => {
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockOrganizationMemberFindUnique.mockResolvedValue({ id: "member-id" });

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
      const mockRedis = createMockRedis();

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
      const mockRedis = createMockRedis({
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockOrganizationMemberFindUnique.mockResolvedValue({ id: "member-id" });

      const result = await checkOrganizationMembership(
        "test-org-id",
        "test-user-id",
      );

      expect(result).toBe(true);
      expect(mockOrganizationMemberFindUnique).toHaveBeenCalled();
    });
  });

  describe("invalidateOrganizationMembershipCache", () => {
    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = createMockRedis({
        del: vi.fn().mockResolvedValue(1),
      });

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

      await expect(
        invalidateOrganizationMembershipCache("test-org-id", "test-user-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("getUserIdFromKeycloakId", () => {
    test("Keycloak IDに対応するUser IDを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockAccountFindFirst.mockResolvedValue({ userId: "tumiki-user-id" });

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
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("cached-user-id"),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getUserIdFromKeycloakId("cached-keycloak-id");

      expect(result).toBe("cached-user-id");
      expect(mockRedis.get).toHaveBeenCalledWith(
        "keycloak:user:cached-keycloak-id",
      );
      expect(mockAccountFindFirst).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBからフェッチしてキャッシュする", async () => {
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockAccountFindFirst.mockResolvedValue({ userId: "tumiki-user-id" });

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
      const mockRedis = createMockRedis();

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
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("null"),
      });

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
      const mockRedis = createMockRedis({
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockAccountFindFirst.mockResolvedValue({ userId: "tumiki-user-id" });

      const result = await getUserIdFromKeycloakId("keycloak-sub-123");

      expect(result).toBe("tumiki-user-id");
      expect(mockAccountFindFirst).toHaveBeenCalled();
    });
  });

  describe("invalidateKeycloakUserCache", () => {
    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = createMockRedis({
        del: vi.fn().mockResolvedValue(1),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      await invalidateKeycloakUserCache("keycloak-sub-123");

      expect(mockRedis.del).toHaveBeenCalledWith(
        "keycloak:user:keycloak-sub-123",
      );
    });

    test("Redisが利用不可の場合はスキップする", async () => {
      mockGetRedisClient.mockResolvedValue(null);

      await expect(
        invalidateKeycloakUserCache("keycloak-sub-123"),
      ).resolves.not.toThrow();
    });
  });

  describe("getUserIdByEmail", () => {
    test("メールアドレスに対応するUser IDを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockUserFindFirst.mockResolvedValue({ id: "tumiki-user-id" });

      const result = await getUserIdByEmail("test@example.com");

      expect(result).toBe("tumiki-user-id");
      expect(mockUserFindFirst).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true },
      });
    });

    test("存在しないメールアドレスの場合はnullを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockUserFindFirst.mockResolvedValue(null);

      const result = await getUserIdByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });

    test("Redisキャッシュからデータを取得する", async () => {
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("cached-user-id"),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getUserIdByEmail("cached@example.com");

      expect(result).toBe("cached-user-id");
      expect(mockRedis.get).toHaveBeenCalledWith(
        "email:user:cached@example.com",
      );
      expect(mockUserFindFirst).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBからフェッチしてキャッシュする", async () => {
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockUserFindFirst.mockResolvedValue({ id: "tumiki-user-id" });

      const result = await getUserIdByEmail("test@example.com");

      expect(result).toBe("tumiki-user-id");
      expect(mockUserFindFirst).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "email:user:test@example.com",
        300,
        "tumiki-user-id",
      );
    });

    test("ネガティブキャッシュ: 存在しないメールアドレスもキャッシュされる", async () => {
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockUserFindFirst.mockResolvedValue(null);

      const result = await getUserIdByEmail("nonexistent@example.com");

      expect(result).toBeNull();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "email:user:nonexistent@example.com",
        300,
        "null",
      );
    });

    test("ネガティブキャッシュからnullを読み取る", async () => {
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("null"),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getUserIdByEmail("cached-null@example.com");

      expect(result).toBeNull();
      expect(mockUserFindFirst).not.toHaveBeenCalled();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockUserFindFirst.mockRejectedValue(new Error("DB connection failed"));

      await expect(getUserIdByEmail("test@example.com")).rejects.toThrow(
        "DB connection failed",
      );
    });

    test("Redisエラー時はDBにフォールバックする", async () => {
      const mockRedis = createMockRedis({
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockUserFindFirst.mockResolvedValue({ id: "tumiki-user-id" });

      const result = await getUserIdByEmail("test@example.com");

      expect(result).toBe("tumiki-user-id");
      expect(mockUserFindFirst).toHaveBeenCalled();
    });
  });

  describe("getTemplateInstanceById", () => {
    test("存在するTemplateInstanceの情報を返す", async () => {
      const mockInstance = {
        id: "test-instance-id",
        mcpServerId: "test-server-id",
      };

      mockGetRedisClient.mockResolvedValue(null);
      mockTemplateInstanceFindUnique.mockResolvedValue(mockInstance);

      const result = await getTemplateInstanceById("test-instance-id");

      expect(result).toStrictEqual(mockInstance);
      expect(mockTemplateInstanceFindUnique).toHaveBeenCalledWith({
        where: { id: "test-instance-id" },
        select: {
          id: true,
          mcpServerId: true,
        },
      });
    });

    test("存在しないTemplateInstanceの場合はnullを返す", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockTemplateInstanceFindUnique.mockResolvedValue(null);

      const result = await getTemplateInstanceById("non-existent-id");

      expect(result).toBeNull();
    });

    test("Redisキャッシュからデータを取得する", async () => {
      const cachedData = {
        id: "cached-instance-id",
        mcpServerId: "cached-server-id",
      };
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue(JSON.stringify(cachedData)),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getTemplateInstanceById("cached-instance-id");

      expect(result).toStrictEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        "template:instance:cached-instance-id",
      );
      expect(mockTemplateInstanceFindUnique).not.toHaveBeenCalled();
    });

    test("キャッシュミス時はDBからフェッチしてキャッシュする", async () => {
      const mockInstance = {
        id: "test-instance-id",
        mcpServerId: "test-server-id",
      };
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockTemplateInstanceFindUnique.mockResolvedValue(mockInstance);

      const result = await getTemplateInstanceById("test-instance-id");

      expect(result).toStrictEqual(mockInstance);
      expect(mockTemplateInstanceFindUnique).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "template:instance:test-instance-id",
        300,
        JSON.stringify({
          id: "test-instance-id",
          mcpServerId: "test-server-id",
        }),
      );
    });

    test("ネガティブキャッシュ: 存在しないTemplateInstanceもキャッシュされる", async () => {
      const mockRedis = createMockRedis();

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockTemplateInstanceFindUnique.mockResolvedValue(null);

      const result = await getTemplateInstanceById("non-existent-id");

      expect(result).toBeNull();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "template:instance:non-existent-id",
        300,
        "null",
      );
    });

    test("ネガティブキャッシュからnullを読み取る", async () => {
      const mockRedis = createMockRedis({
        get: vi.fn().mockResolvedValue("null"),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      const result = await getTemplateInstanceById("cached-null-id");

      expect(result).toBeNull();
      expect(mockTemplateInstanceFindUnique).not.toHaveBeenCalled();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockGetRedisClient.mockResolvedValue(null);
      mockTemplateInstanceFindUnique.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(getTemplateInstanceById("test-instance-id")).rejects.toThrow(
        "DB connection failed",
      );
    });

    test("Redisエラー時はDBにフォールバックする", async () => {
      const mockInstance = {
        id: "test-instance-id",
        mcpServerId: "test-server-id",
      };
      const mockRedis = createMockRedis({
        get: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);
      mockTemplateInstanceFindUnique.mockResolvedValue(mockInstance);

      const result = await getTemplateInstanceById("test-instance-id");

      expect(result).toStrictEqual(mockInstance);
      expect(mockTemplateInstanceFindUnique).toHaveBeenCalled();
    });
  });

  describe("invalidateTemplateInstanceCache", () => {
    test("キャッシュを正しく無効化する", async () => {
      const mockRedis = createMockRedis({
        del: vi.fn().mockResolvedValue(1),
      });

      mockGetRedisClient.mockResolvedValue(mockRedis);

      await invalidateTemplateInstanceCache("test-instance-id");

      expect(mockRedis.del).toHaveBeenCalledWith(
        "template:instance:test-instance-id",
      );
    });

    test("Redisが利用不可の場合はスキップする", async () => {
      mockGetRedisClient.mockResolvedValue(null);

      await expect(
        invalidateTemplateInstanceCache("test-instance-id"),
      ).resolves.not.toThrow();
    });
  });
});
