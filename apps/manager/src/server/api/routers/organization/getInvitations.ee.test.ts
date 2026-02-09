// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.
import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { getInvitations } from "./getInvitations.ee";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";
import type { OrganizationInvitation, User } from "@tumiki/db";

const mockOrganizationId = "cm123456789abcdefghij" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitedUserId = "user_invited789";

type MockInvitationWithUser = OrganizationInvitation & {
  invitedByUser: Pick<User, "id" | "name" | "email" | "image">;
};

type MockDb = {
  organizationMember: {
    findFirst: MockedFunction<() => Promise<unknown>>;
    findUnique: MockedFunction<() => Promise<unknown>>;
  };
  organizationInvitation: {
    findMany: MockedFunction<() => Promise<MockInvitationWithUser[]>>;
  };
  $runWithoutRLS: MockedFunction<
    (fn: (db: unknown) => Promise<unknown>) => Promise<unknown>
  >;
};

describe("getInvitations（EE版）", () => {
  let mockCtx: ProtectedContext;
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = {
      organizationMember: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
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
          organizationId: mockOrganizationId,
          organizationSlug: "test-org",
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as unknown as ProtectedContext["session"],
      currentOrg: {
        id: mockOrganizationId,
        createdBy: mockUserId,
        isPersonal: false,
        members: [
          {
            id: "member_test123",
            userId: mockUserId,
          },
        ],
      },
      headers: new Headers(),
    } as unknown as ProtectedContext;
  });

  test("管理者が招待一覧を取得できる", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1日前

    // 招待データをモック
    const mockInvitations: MockInvitationWithUser[] = [
      {
        id: "cm123456789abcdefghi1",
        organizationId: mockOrganizationId,
        email: "pending@example.com",
        token: "token1",
        invitedBy: mockInvitedUserId,
        roles: ["Member"],
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
        id: "cm123456789abcdefghi2",
        organizationId: mockOrganizationId,
        email: "expired@example.com",
        token: "token2",
        invitedBy: mockInvitedUserId,
        roles: ["Admin"],
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
      ctx: mockCtx,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.email).toStrictEqual("pending@example.com");
    expect(result[0]?.expires).toStrictEqual(futureDate);
    expect(result[0]?.invitedByUser.name).toStrictEqual("Inviter Name");
    expect(result[1]?.email).toStrictEqual("expired@example.com");
    expect(result[1]?.expires).toStrictEqual(pastDate);
    expect(result[1]?.invitedByUser.name).toStrictEqual("Inviter Name");
  });

  test("一般ユーザーでも招待一覧を取得できる（閲覧のみ）", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 招待データをモック
    const mockInvitations: MockInvitationWithUser[] = [
      {
        id: "cm123456789abcdefghi1",
        organizationId: mockOrganizationId,
        email: "pending@example.com",
        token: "token1",
        invitedBy: mockInvitedUserId,
        roles: ["Member"],
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
    ];

    mockDb.organizationInvitation.findMany.mockResolvedValue(mockInvitations);

    // 一般ユーザーのコンテキストを作成（session.user.isOrganizationAdminで判定されるため、currentOrgは変更不要）
    const nonAdminCtx: typeof mockCtx = {
      ...mockCtx,
      session: {
        ...mockCtx.session,
        user: {
          ...mockCtx.session.user,
          isOrganizationAdmin: false,
        },
      } as unknown as ProtectedContext["session"],
    };

    // 一般ユーザーでも招待一覧を取得できることを確認
    const result = await getInvitations({
      ctx: nonAdminCtx,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.email).toStrictEqual("pending@example.com");
  });

  test("招待がない場合は空の配列を返す", async () => {
    // 管理者メンバーシップをモック
    mockDb.organizationMember.findUnique.mockResolvedValue({
      isAdmin: true,
    });

    // 招待がない状態をモック
    mockDb.organizationInvitation.findMany.mockResolvedValue([]);

    const result = await getInvitations({
      ctx: mockCtx,
    });

    expect(result).toStrictEqual([]);
  });
});
