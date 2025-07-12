import { describe, test, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { PermissionAction, ResourceType } from "@tumiki/db";
import { createRule } from "../createRule";
import { updateRule } from "../updateRule";
import { deleteRule } from "../deleteRule";
import { checkAccess } from "../checkAccess";

// モックデータベース
const mockDb = {
  organizationMember: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  organizationGroup: {
    findFirst: vi.fn(),
  },
  resourceAccessControl: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const mockContext = {
  db: mockDb,
  session: {
    user: {
      id: "user1",
      name: "テストユーザー",
      email: "test@example.com",
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resourceAccessControl ルーター", () => {
  describe("createRule", () => {
    test("管理者権限を持つユーザーがルールを作成できる", async () => {
      // 管理者メンバーとして設定
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: "member1",
        organizationId: "org1",
        userId: "user1",
        isAdmin: true,
      });

      // 重複チェックで既存ルールなし
      mockDb.resourceAccessControl.findFirst.mockResolvedValue(null);

      // 作成成功
      const createdRule = {
        id: "rule1",
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        memberId: "member1",
        groupId: null,
        allowedActions: [PermissionAction.READ],
        deniedActions: [],
      };
      mockDb.resourceAccessControl.create.mockResolvedValue(createdRule);

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        memberId: "member1",
        allowedActions: [PermissionAction.READ],
      };

      const result = await createRule({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual(createdRule);
      expect(mockDb.resourceAccessControl.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org1",
          resourceType: ResourceType.MCP_SERVER_CONFIG,
          resourceId: "resource1",
          memberId: "member1",
          groupId: undefined,
          allowedActions: [PermissionAction.READ],
          deniedActions: [],
        },
        include: expect.any(Object),
      });
    });

    test("管理者権限を持たないユーザーはルールを作成できない", async () => {
      // 管理者ではないメンバー
      mockDb.organizationMember.findFirst.mockResolvedValue(null);

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        memberId: "member1",
        allowedActions: [PermissionAction.READ],
      };

      await expect(
        createRule({
          ctx: mockContext as any,
          input,
        })
      ).rejects.toThrow(TRPCError);
    });

    test("メンバーIDとグループIDの両方が指定された場合はエラー", async () => {
      // 管理者として設定
      mockDb.organizationMember.findFirst.mockResolvedValue({
        isAdmin: true,
      });

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        memberId: "member1",
        groupId: "group1",
        allowedActions: [PermissionAction.READ],
      };

      await expect(
        createRule({
          ctx: mockContext as any,
          input,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("updateRule", () => {
    test("管理者権限を持つユーザーがルールを更新できる", async () => {
      // 既存ルール
      const existingRule = {
        id: "rule1",
        organizationId: "org1",
        organization: { id: "org1", name: "テスト組織" },
      };
      mockDb.resourceAccessControl.findUnique.mockResolvedValue(existingRule);

      // 管理者として設定
      mockDb.organizationMember.findFirst.mockResolvedValue({
        isAdmin: true,
      });

      // 更新後のルール
      const updatedRule = {
        ...existingRule,
        allowedActions: [PermissionAction.READ, PermissionAction.UPDATE],
      };
      mockDb.resourceAccessControl.update.mockResolvedValue(updatedRule);

      const input = {
        id: "rule1",
        allowedActions: [PermissionAction.READ, PermissionAction.UPDATE],
      };

      const result = await updateRule({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual(updatedRule);
      expect(mockDb.resourceAccessControl.update).toHaveBeenCalledWith({
        where: { id: "rule1" },
        data: {
          allowedActions: [PermissionAction.READ, PermissionAction.UPDATE],
        },
        include: expect.any(Object),
      });
    });

    test("存在しないルールは更新できない", async () => {
      mockDb.resourceAccessControl.findUnique.mockResolvedValue(null);

      const input = {
        id: "nonexistent",
        allowedActions: [PermissionAction.READ],
      };

      await expect(
        updateRule({
          ctx: mockContext as any,
          input,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("deleteRule", () => {
    test("管理者権限を持つユーザーがルールを削除できる", async () => {
      // 既存ルール
      const existingRule = {
        id: "rule1",
        organizationId: "org1",
        organization: { id: "org1", name: "テスト組織" },
      };
      mockDb.resourceAccessControl.findUnique.mockResolvedValue(existingRule);

      // 管理者として設定
      mockDb.organizationMember.findFirst.mockResolvedValue({
        isAdmin: true,
      });

      mockDb.resourceAccessControl.delete.mockResolvedValue({});

      const input = { id: "rule1" };

      const result = await deleteRule({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual({
        success: true,
        message: "アクセス制御ルールを削除しました",
      });
      expect(mockDb.resourceAccessControl.delete).toHaveBeenCalledWith({
        where: { id: "rule1" },
      });
    });
  });

  describe("checkAccess", () => {
    test("管理者は全てのアクションが許可される", async () => {
      // 管理者メンバー
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: "member1",
        isAdmin: true,
        roles: [],
        groups: [],
      });

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        action: PermissionAction.DELETE,
      };

      const result = await checkAccess({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual({
        hasAccess: true,
        reason: "管理者権限",
      });
    });

    test("組織のメンバーでない場合はアクセス拒否", async () => {
      mockDb.organizationMember.findFirst.mockResolvedValue(null);

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        action: PermissionAction.READ,
      };

      const result = await checkAccess({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual({
        hasAccess: false,
        reason: "ユーザーがこの組織のメンバーではありません",
      });
    });

    test("明示的な拒否ルールがある場合はアクセス拒否", async () => {
      // 通常メンバー
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: "member1",
        isAdmin: false,
        roles: [],
        groups: [],
      });

      // 拒否ルールあり
      mockDb.resourceAccessControl.findMany.mockResolvedValue([
        {
          id: "rule1",
          allowedActions: [],
          deniedActions: [PermissionAction.DELETE],
        },
      ]);

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        action: PermissionAction.DELETE,
      };

      const result = await checkAccess({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual({
        hasAccess: false,
        reason: "明示的な拒否ルールにより禁止されています",
      });
    });

    test("明示的な許可ルールがある場合はアクセス許可", async () => {
      // 通常メンバー
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: "member1",
        isAdmin: false,
        roles: [],
        groups: [],
      });

      // 許可ルールあり
      mockDb.resourceAccessControl.findMany.mockResolvedValue([
        {
          id: "rule1",
          allowedActions: [PermissionAction.READ],
          deniedActions: [],
        },
      ]);

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        action: PermissionAction.READ,
      };

      const result = await checkAccess({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual({
        hasAccess: true,
        reason: "明示的な許可ルール",
      });
    });

    test("ロールベース権限がある場合はアクセス許可", async () => {
      // ロールを持つメンバー
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: "member1",
        isAdmin: false,
        roles: [
          {
            id: "role1",
            permissions: [
              {
                resourceType: ResourceType.MCP_SERVER_CONFIG,
                action: PermissionAction.READ,
              },
            ],
          },
        ],
        groups: [],
      });

      // 明示的ルールなし
      mockDb.resourceAccessControl.findMany.mockResolvedValue([]);

      const input = {
        organizationId: "org1",
        resourceType: ResourceType.MCP_SERVER_CONFIG,
        resourceId: "resource1",
        action: PermissionAction.READ,
      };

      const result = await checkAccess({
        ctx: mockContext as any,
        input,
      });

      expect(result).toStrictEqual({
        hasAccess: true,
        reason: "ロールベース権限",
      });
    });
  });
});