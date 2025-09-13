import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { inviteMember } from "./inviteMember";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";
import type { Organization, OrganizationInvitation } from "@tumiki/db";

// メール送信サービスのモック
vi.mock("@tumiki/mailer", () => ({
  createMailClient: vi.fn(() => ({})),
  sendInvitation: vi.fn().mockResolvedValue({ success: true }),
}));

// cuid2のモック
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "new_token_123"),
}));

const mockOrganizationId = "cm123456789abcdefghij" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitationEmail = "invited@example.com";

type MockInvitationWithOrg = OrganizationInvitation & {
  organization: Organization;
};

type MockTransaction = {
  organizationInvitation: {
    findFirst: MockedFunction<() => Promise<OrganizationInvitation | null>>;
    create: MockedFunction<() => Promise<MockInvitationWithOrg>>;
  };
};

type MockDb = {
  organizationMember: {
    findFirst: MockedFunction<() => Promise<unknown>>;
  };
  organizationInvitation: {
    findFirst: MockedFunction<() => Promise<OrganizationInvitation | null>>;
    create: MockedFunction<() => Promise<MockInvitationWithOrg>>;
  };
  $transaction: MockedFunction<
    (callback: (tx: MockTransaction) => Promise<unknown>) => Promise<unknown>
  >;
  $runWithoutRLS: MockedFunction<
    (fn: (db: unknown) => Promise<unknown>) => Promise<unknown>
  >;
};

describe("inviteMember", () => {
  let mockCtx: ProtectedContext;
  let mockTx: MockTransaction;
  let mockDb: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx = {
      organizationInvitation: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    mockDb = {
      organizationMember: {
        findFirst: vi.fn(),
      },
      organizationInvitation: {
        findFirst: vi.fn(),
        create: vi.fn(),
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
      currentOrganizationId: mockOrganizationId,
      isCurrentOrganizationAdmin: true,
      headers: new Headers(),
    } as ProtectedContext;
  });

  test("管理者が新しいメンバーを招待できる", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 既存の招待がないことを確認
    mockTx.organizationInvitation.findFirst.mockResolvedValue(null);

    // 新しい招待データをモック
    const mockInvitation: MockInvitationWithOrg = {
      id: "cm123456789abcdefghi3",
      organizationId: mockOrganizationId,
      email: mockInvitationEmail,
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
        description: "Test Description",
        logoUrl: null,
        isDeleted: false,
        isPersonal: false,
        maxMembers: 100,
        createdBy: mockUserId,
        createdAt: now,
        updatedAt: now,
      },
    };

    mockTx.organizationInvitation.create.mockResolvedValue(mockInvitation);

    const result = await inviteMember({
      input: {
        email: mockInvitationEmail,
        isAdmin: false,
        roleIds: [],
        groupIds: [],
      },
      ctx: mockCtx,
    });

    expect(result.id).toStrictEqual("cm123456789abcdefghi3");
    expect(result.email).toStrictEqual(mockInvitationEmail);
    expect(result.expires).toStrictEqual(futureDate);
    expect(mockTx.organizationInvitation.create).toHaveBeenCalledWith({
      data: {
        organizationId: mockOrganizationId,
        email: mockInvitationEmail,
        token: "new_token_123",
        invitedBy: mockUserId,
        isAdmin: false,
        roleIds: [],
        groupIds: [],
        expires: expect.any(Date) as Date,
      },
      include: {
        organization: true,
      },
    });
  });

  test("重複する招待はエラーになる", async () => {
    // 既存の招待があることをモック
    const existingInvitation: OrganizationInvitation = {
      id: "existing_invitation_id",
      organizationId: mockOrganizationId,
      email: mockInvitationEmail,
      token: "existing_token",
      invitedBy: mockUserId,
      isAdmin: false,
      roleIds: [],
      groupIds: [],
      expires: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTx.organizationInvitation.findFirst.mockResolvedValue(
      existingInvitation,
    );

    await expect(
      inviteMember({
        input: {
          email: mockInvitationEmail,
          isAdmin: false,
          roleIds: [],
          groupIds: [],
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("管理者でないユーザーはエラーになる", async () => {
    // 管理者でないコンテキストを作成
    const nonAdminCtx = {
      ...mockCtx,
      isCurrentOrganizationAdmin: false,
    };

    await expect(
      inviteMember({
        input: {
          email: mockInvitationEmail,
          isAdmin: false,
          roleIds: [],
          groupIds: [],
        },
        ctx: nonAdminCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("トランザクション内でのエラーが適切に処理される", async () => {
    // トランザクションでエラーが発生
    mockDb.$transaction.mockRejectedValue(new Error("Database error"));

    await expect(
      inviteMember({
        input: {
          email: mockInvitationEmail,
          isAdmin: false,
          roleIds: [],
          groupIds: [],
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });
});
