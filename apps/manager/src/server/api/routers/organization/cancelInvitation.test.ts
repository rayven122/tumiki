import { describe, test, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { cancelInvitation } from "./cancelInvitation";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";
import type { OrganizationInvitation } from "@tumiki/db";

// validateOrganizationAdminAccessのモック
vi.mock("@/server/utils/organizationPermissions", () => ({
  validateOrganizationAdminAccess: vi.fn(),
}));

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitationId = "inv_test789";

type MockTransaction = {
  organizationInvitation: {
    findFirst: MockedFunction<() => Promise<OrganizationInvitation | null>>;
    findMany: MockedFunction<() => Promise<OrganizationInvitation[]>>;
    update: MockedFunction<() => Promise<OrganizationInvitation>>;
    delete: MockedFunction<() => Promise<OrganizationInvitation>>;
  };
};

type MockDb = {
  organizationMember: {
    findFirst: MockedFunction<() => Promise<unknown>>;
  };
  organizationInvitation: {
    findFirst: MockedFunction<() => Promise<OrganizationInvitation | null>>;
    findMany: MockedFunction<() => Promise<OrganizationInvitation[]>>;
    update: MockedFunction<() => Promise<OrganizationInvitation>>;
    delete: MockedFunction<() => Promise<OrganizationInvitation>>;
  };
  $transaction: MockedFunction<(callback: (tx: MockTransaction) => Promise<unknown>) => Promise<unknown>>;
  $runWithoutRLS: MockedFunction<(fn: (db: unknown) => Promise<unknown>) => Promise<unknown>>;
};

describe("cancelInvitation", () => {
  let mockCtx: ProtectedContext;
  let mockTx: MockTransaction;
  let mockDb: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTx = {
      organizationInvitation: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    mockDb = {
      organizationMember: {
        findFirst: vi.fn(),
      },
      organizationInvitation: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockTx)),
      $runWithoutRLS: vi.fn(),
    };
    
    mockCtx = {
      db: mockDb as unknown as ProtectedContext["db"],
      session: {
        user: {
          id: mockUserId,
          email: "test@example.com",
        },
      } as ProtectedContext["session"],
    } as ProtectedContext;
  });

  test("管理者が招待をキャンセルできる", async () => {
    // 権限検証は成功するようモック
    const { validateOrganizationAdminAccess } = await import("@/server/utils/organizationPermissions");
    vi.mocked(validateOrganizationAdminAccess).mockResolvedValue({
      organization: {
        id: mockOrganizationId,
        name: "Test Organization",
        description: null,
        logoUrl: null,
        isDeleted: false,
        isPersonal: false,
        maxMembers: 10,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: "member1",
            userId: mockUserId,
            isAdmin: true,
          },
        ],
      },
      userMember: {
        id: "member1",
        userId: mockUserId,
        isAdmin: true,
      },
    });

    const now = new Date();

    // 既存の招待データをモック
    const existingInvitation: OrganizationInvitation = {
      id: mockInvitationId,
      organizationId: mockOrganizationId,
      email: "invited@example.com",
      token: "token123",
      invitedBy: mockUserId,
      isAdmin: false,
      roleIds: [],
      groupIds: [],
      expires: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };
    mockTx.organizationInvitation.findFirst.mockResolvedValue(existingInvitation);

    // 削除操作をモック
    mockTx.organizationInvitation.delete.mockResolvedValue(existingInvitation);

    const result = await cancelInvitation({
      input: {
        organizationId: mockOrganizationId,
        invitationId: mockInvitationId,
      },
      ctx: mockCtx,
    });

    expect(result.success).toStrictEqual(true);
    expect(mockTx.organizationInvitation.delete).toHaveBeenCalledWith({
      where: { id: mockInvitationId },
    });
  });

  test("存在しない招待はエラーになる", async () => {
    // 権限検証は成功するようモック
    const { validateOrganizationAdminAccess } = await import("@/server/utils/organizationPermissions");
    vi.mocked(validateOrganizationAdminAccess).mockResolvedValue({
      organization: {
        id: mockOrganizationId,
        name: "Test Organization",
        description: null,
        logoUrl: null,
        isDeleted: false,
        isPersonal: false,
        maxMembers: 10,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: "member1",
            userId: mockUserId,
            isAdmin: true,
          },
        ],
      },
      userMember: {
        id: "member1",
        userId: mockUserId,
        isAdmin: true,
      },
    });

    // 招待が見つからない
    mockTx.organizationInvitation.findFirst.mockResolvedValue(null);

    await expect(
      cancelInvitation({
        input: {
          organizationId: mockOrganizationId,
          invitationId: mockInvitationId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("管理者でないユーザーはエラーになる", async () => {
    // 権限検証でエラーを発生させる
    const { validateOrganizationAdminAccess } = await import("@/server/utils/organizationPermissions");
    vi.mocked(validateOrganizationAdminAccess).mockRejectedValue(
      new TRPCError({
        code: "FORBIDDEN",
        message: "管理者権限が必要です。",
      }),
    );

    await expect(
      cancelInvitation({
        input: {
          organizationId: mockOrganizationId,
          invitationId: mockInvitationId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("トランザクション内でのエラーが適切に処理される", async () => {
    // 権限検証は成功するようモック
    const { validateOrganizationAdminAccess } = await import("@/server/utils/organizationPermissions");
    vi.mocked(validateOrganizationAdminAccess).mockResolvedValue({
      organization: {
        id: mockOrganizationId,
        name: "Test Organization",
        description: null,
        logoUrl: null,
        isDeleted: false,
        isPersonal: false,
        maxMembers: 10,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: "member1",
            userId: mockUserId,
            isAdmin: true,
          },
        ],
      },
      userMember: {
        id: "member1",
        userId: mockUserId,
        isAdmin: true,
      },
    });

    // トランザクションでエラーが発生
    mockDb.$transaction.mockRejectedValue(new Error("Database error"));

    await expect(
      cancelInvitation({
        input: {
          organizationId: mockOrganizationId,
          invitationId: mockInvitationId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });
});