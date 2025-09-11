import { describe, test, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { resendInvitation } from "./resendInvitation";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";
import type { Organization, OrganizationInvitation, User } from "@tumiki/db";

// メール送信サービスのモック
vi.mock("@/server/services/emailService", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

// validateOrganizationAdminAccessのモック
vi.mock("@/server/utils/organizationPermissions", () => ({
  validateOrganizationAdminAccess: vi.fn(),
}));

// cuid2のモック
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "new_token_123"),
}));

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitationId = "inv_test789";

type MockInvitation = OrganizationInvitation & {
  organization: Organization;
  invitedByUser: Pick<User, "id" | "name" | "email" | "image">;
};

type MockTransaction = {
  organizationInvitation: {
    findFirst: MockedFunction<() => Promise<OrganizationInvitation | null>>;
    update: MockedFunction<() => Promise<MockInvitation>>;
  };
};

type MockDb = {
  organizationMember: {
    findFirst: MockedFunction<() => Promise<unknown>>;
  };
  organizationInvitation: {
    findFirst: MockedFunction<() => Promise<OrganizationInvitation | null>>;
    update: MockedFunction<() => Promise<MockInvitation>>;
  };
  $transaction: MockedFunction<(callback: (tx: MockTransaction) => Promise<MockInvitation>) => Promise<MockInvitation>>;
  $runWithoutRLS: MockedFunction<(fn: (db: unknown) => Promise<unknown>) => Promise<unknown>>;
};

describe("resendInvitation", () => {
  let mockCtx: ProtectedContext;
  let mockTx: MockTransaction;
  let mockDb: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTx = {
      organizationInvitation: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    mockDb = {
      organizationMember: {
        findFirst: vi.fn(),
      },
      organizationInvitation: {
        findFirst: vi.fn(),
        update: vi.fn(),
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

  test("管理者が招待を再送信できる", async () => {
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
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 既存の招待データをモック
    const existingInvitation: OrganizationInvitation = {
      id: mockInvitationId,
      organizationId: mockOrganizationId,
      email: "invited@example.com",
      token: "old_token",
      invitedBy: mockUserId,
      isAdmin: false,
      roleIds: [],
      groupIds: [],
      expires: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1日前
      createdAt: now,
      updatedAt: now,
    };
    mockTx.organizationInvitation.findFirst.mockResolvedValue(existingInvitation);

    // 更新後の招待データをモック
    const updatedInvitation: MockInvitation = {
      id: mockInvitationId,
      organizationId: mockOrganizationId,
      email: "invited@example.com",
      token: "new_token_123",
      invitedBy: mockUserId,
      isAdmin: false,
      roleIds: [],
      groupIds: [],
      expires: futureDate,
      createdAt: now,
      updatedAt: now,
      organization: {
        id: mockOrganizationId,
        name: "Test Organization",
        description: null,
        logoUrl: null,
        isDeleted: false,
        isPersonal: false,
        maxMembers: 10,
        createdBy: mockUserId,
        createdAt: now,
        updatedAt: now,
      },
      invitedByUser: {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        image: null,
      },
    };
    mockTx.organizationInvitation.update.mockResolvedValue(updatedInvitation);

    const result = await resendInvitation({
      input: {
        organizationId: mockOrganizationId,
        invitationId: mockInvitationId,
      },
      ctx: mockCtx,
    });

    expect(result.id).toStrictEqual(mockInvitationId);
    expect(result.email).toStrictEqual("invited@example.com");
    expect(mockTx.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: mockInvitationId },
      data: {
        token: "new_token_123",
        expires: expect.any(Date) as Date,
        invitedBy: mockUserId,
      },
      include: {
        organization: true,
        invitedByUser: true,
      },
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
      resendInvitation({
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
      resendInvitation({
        input: {
          organizationId: mockOrganizationId,
          invitationId: mockInvitationId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });
});