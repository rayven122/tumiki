/**
 * mcpServerRepository.ts のテスト
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
} = vi.hoisted(() => ({
  mockMcpServerFindUnique: vi.fn(),
  mockOrganizationMemberFindUnique: vi.fn(),
  mockAccountFindFirst: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockTemplateInstanceFindUnique: vi.fn(),
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

vi.mock("../../../../shared/logger/index.js", () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

import {
  getMcpServerOrganization,
  checkOrganizationMembership,
  getTemplateInstanceById,
  getMcpServerBySlug,
} from "../mcpServerRepository.js";
import {
  getUserIdFromKeycloakId,
  getUserIdByEmail,
} from "../userRepository.js";

// テストデータ生成ヘルパー
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

      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerOrganization("deleted-server-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(result?.deletedAt).toStrictEqual(deletedAt);
    });

    test("DB エラー時は例外をスローする", async () => {
      mockMcpServerFindUnique.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(getMcpServerOrganization("test-server-id")).rejects.toThrow(
        "DB connection failed",
      );
    });
  });

  describe("checkOrganizationMembership", () => {
    test("組織のメンバーである場合はtrueを返す", async () => {
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
      mockOrganizationMemberFindUnique.mockResolvedValue(null);

      const result = await checkOrganizationMembership(
        "test-org-id",
        "non-member-user-id",
      );

      expect(result).toBe(false);
    });
  });

  describe("getUserIdFromKeycloakId", () => {
    test("Keycloak IDに対応するUser IDを返す", async () => {
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
      mockAccountFindFirst.mockResolvedValue(null);

      const result = await getUserIdFromKeycloakId("non-existent-keycloak-id");

      expect(result).toBeNull();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockAccountFindFirst.mockRejectedValue(new Error("DB connection failed"));

      await expect(getUserIdFromKeycloakId("keycloak-sub-123")).rejects.toThrow(
        "DB connection failed",
      );
    });
  });

  describe("getUserIdByEmail", () => {
    test("メールアドレスに対応するUser IDを返す", async () => {
      mockUserFindFirst.mockResolvedValue({ id: "tumiki-user-id" });

      const result = await getUserIdByEmail("test@example.com");

      expect(result).toBe("tumiki-user-id");
      expect(mockUserFindFirst).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true },
      });
    });

    test("存在しないメールアドレスの場合はnullを返す", async () => {
      mockUserFindFirst.mockResolvedValue(null);

      const result = await getUserIdByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockUserFindFirst.mockRejectedValue(new Error("DB connection failed"));

      await expect(getUserIdByEmail("test@example.com")).rejects.toThrow(
        "DB connection failed",
      );
    });
  });

  describe("getTemplateInstanceById", () => {
    test("存在するTemplateInstanceの情報を返す", async () => {
      const mockInstance = {
        id: "test-instance-id",
        mcpServerId: "test-server-id",
      };

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
      mockTemplateInstanceFindUnique.mockResolvedValue(null);

      const result = await getTemplateInstanceById("non-existent-id");

      expect(result).toBeNull();
    });

    test("DB エラー時は例外をスローする", async () => {
      mockTemplateInstanceFindUnique.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(getTemplateInstanceById("test-instance-id")).rejects.toThrow(
        "DB connection failed",
      );
    });
  });

  describe("getMcpServerBySlug", () => {
    test("slugとorganizationIdでMcpServerを取得する", async () => {
      const mockMcpServer = createMcpServerData();

      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerBySlug("my-server", "test-org-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(mockMcpServerFindUnique).toHaveBeenCalledWith({
        where: {
          organizationId_slug: {
            organizationId: "test-org-id",
            slug: "my-server",
          },
        },
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

    test("存在しないslugの場合はnullを返す", async () => {
      mockMcpServerFindUnique.mockResolvedValue(null);

      const result = await getMcpServerBySlug(
        "non-existent-server",
        "test-org-id",
      );

      expect(result).toBeNull();
    });

    test("削除されたMcpServerの場合もデータを返す（deletedAtを含む）", async () => {
      const deletedAt = new Date("2024-01-01");
      const mockMcpServer = createMcpServerData({
        id: "deleted-server-id",
        deletedAt,
        authType: "API_KEY" as const,
      });

      mockMcpServerFindUnique.mockResolvedValue(mockMcpServer);

      const result = await getMcpServerBySlug("deleted-server", "test-org-id");

      expect(result).toStrictEqual(mockMcpServer);
      expect(result?.deletedAt).toStrictEqual(deletedAt);
    });

    test("DB エラー時は例外をスローする", async () => {
      mockMcpServerFindUnique.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(
        getMcpServerBySlug("my-server", "test-org-id"),
      ).rejects.toThrow("DB connection failed");
    });
  });
});
