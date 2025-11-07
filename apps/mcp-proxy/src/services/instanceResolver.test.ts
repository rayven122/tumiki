import { describe, test, expect, vi, beforeEach } from "vitest";
import { resolveUserMcpServerInstance } from "./instanceResolver.js";
import type { JWTPayload } from "../types/index.js";

// モックの設定
vi.mock("@tumiki/db/server", () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
    },
    userMcpServerInstance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

// モックされたdb
const { db } = await import("@tumiki/db/server");

describe("resolveUserMcpServerInstance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockJWTPayload = (
    orgId = "org_test123",
    userId = "user_test456",
    instanceId?: string,
  ): JWTPayload => ({
    sub: "keycloak_user_id",
    tumiki: {
      org_id: orgId,
      is_org_admin: false,
      tumiki_user_id: userId,
      mcp_instance_id: instanceId,
    },
  });

  const createMockInstance = (
    id = "instance_1",
    orgId = "org_test123",
    deletedAt: Date | null = null,
  ) => ({
    id,
    name: "Test OAuth Instance",
    description: "Test instance",
    iconPath: null,
    serverStatus: "RUNNING" as const,
    serverType: "OFFICIAL" as const,
    toolGroupId: "toolgroup_1",
    authType: "OAUTH" as const,
    organizationId: orgId,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt,
  });

  describe("正常系", () => {
    test("JWTから指定されたインスタンスが正しく解決される", async () => {
      const mockInstance = createMockInstance();

      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockInstance,
      );

      const jwtPayload = createMockJWTPayload(
        "org_test123",
        "user_test456",
        "instance_1",
      );
      const result = await resolveUserMcpServerInstance(jwtPayload);

      expect(result).toStrictEqual(mockInstance);
      expect(db.userMcpServerInstance.findUnique).toHaveBeenCalledWith({
        where: { id: "instance_1" },
      });
    });
  });

  describe("異常系: mcp_instance_id なし", () => {
    test("mcp_instance_idがない場合、エラーをスローする", async () => {
      // mcp_instance_idなしのJWT
      const jwtPayload = createMockJWTPayload("org_test123", "user_test456");

      await expect(resolveUserMcpServerInstance(jwtPayload)).rejects.toThrow(
        "mcp_instance_id is required for MCP server access",
      );
    });
  });

  describe("異常系: インスタンス不存在 (mcp_instance_id あり)", () => {
    test("インスタンスが見つからない場合、エラーをスローする", async () => {
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(null);

      const jwtPayload = createMockJWTPayload(
        "org_test123",
        "user_test456",
        "instance_1",
      );

      await expect(resolveUserMcpServerInstance(jwtPayload)).rejects.toThrow(
        "MCP server instance not found",
      );
    });
  });

  describe("異常系: インスタンス削除済み (mcp_instance_id あり)", () => {
    test("インスタンスが削除されている場合、エラーをスローする", async () => {
      const deletedDate = new Date();
      const mockInstance = createMockInstance(
        "instance_1",
        "org_test123",
        deletedDate,
      );

      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockInstance,
      );

      const jwtPayload = createMockJWTPayload(
        "org_test123",
        "user_test456",
        "instance_1",
      );

      await expect(resolveUserMcpServerInstance(jwtPayload)).rejects.toThrow(
        "MCP server instance is deleted",
      );
    });
  });

  describe("異常系: 組織ID不一致 (mcp_instance_id あり)", () => {
    test("インスタンスの組織IDがJWTの組織IDと一致しない場合、エラーをスローする", async () => {
      // インスタンスは別の組織に属している
      const mockInstance = createMockInstance("instance_1", "org_different");

      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue(
        mockInstance,
      );

      const jwtPayload = createMockJWTPayload(
        "org_test123",
        "user_test456",
        "instance_1",
      );

      await expect(resolveUserMcpServerInstance(jwtPayload)).rejects.toThrow(
        "Organization ID mismatch",
      );
    });
  });
});
