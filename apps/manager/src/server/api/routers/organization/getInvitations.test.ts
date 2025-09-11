import { describe, test, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { getInvitations } from "./getInvitations";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";
import type { OrganizationInvitation, User } from "@tumiki/db";

// validateOrganizationAdminAccessのモック
vi.mock("@/server/utils/organizationPermissions", () => ({
  validateOrganizationAdminAccess: vi.fn(),
}));

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitedUserId = "user_invited789";

type MockInvitationWithUser = OrganizationInvitation & {
  invitedByUser: Pick<User, "id" | "name" | "email" | "image">;
};

type MockDb = {
  organizationMember: {
    findFirst: MockedFunction<() => Promise<unknown>>;
  };
  organizationInvitation: {
    findMany: MockedFunction<() => Promise<MockInvitationWithUser[]>>;
  };
  $runWithoutRLS: MockedFunction<(fn: (db: unknown) => Promise<unknown>) => Promise<unknown>>;
};

describe("getInvitations", () => {
  let mockCtx: ProtectedContext;
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = {
      organizationMember: {
        findFirst: vi.fn(),
      },
      organizationInvitation: {
        findMany: vi.fn(),
      },
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

  test("管理者が招待一覧を取得できる", async () => {
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
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1日前

    // 招待データをモック
    const mockInvitations: MockInvitationWithUser[] = [
      {
        id: "inv1",
        organizationId: mockOrganizationId,
        email: "pending@example.com",
        token: "token1",
        invitedBy: mockInvitedUserId,
        isAdmin: false,
        roleIds: [],
        groupIds: [],
        expires: futureDate,
        createdAt: now,
        updatedAt: now,
        invitedByUser: {
          id: mockInvitedUserId,
          name: "Inviter Name",
          email: "inviter@example.com",
          image: null,
        },
      },
      {
        id: "inv2",
        organizationId: mockOrganizationId,
        email: "expired@example.com",
        token: "token2",
        invitedBy: mockInvitedUserId,
        isAdmin: true,
        roleIds: ["role1"],
        groupIds: ["group1"],
        expires: pastDate,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: now,
        invitedByUser: {
          id: mockInvitedUserId,
          name: "Inviter Name",
          email: "inviter@example.com",
          image: null,
        },
      },
    ];
    
    mockDb.organizationInvitation.findMany.mockResolvedValue(mockInvitations);

    const result = await getInvitations({
      input: { organizationId: mockOrganizationId },
      ctx: mockCtx,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.email).toStrictEqual("pending@example.com");
    expect(result[0]?.status).toStrictEqual("pending");
    expect(result[1]?.email).toStrictEqual("expired@example.com");
    expect(result[1]?.status).toStrictEqual("expired");
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
      getInvitations({
        input: { organizationId: mockOrganizationId },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("招待がない場合は空の配列を返す", async () => {
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

    // 招待がない状態をモック
    mockDb.organizationInvitation.findMany.mockResolvedValue([]);

    const result = await getInvitations({
      input: { organizationId: mockOrganizationId },
      ctx: mockCtx,
    });

    expect(result).toStrictEqual([]);
  });
});