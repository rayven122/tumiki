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
import { cancelInvitation } from "./cancelInvitation.ee";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import {
  type OrganizationId,
  type OrganizationInvitationId,
} from "@/schema/ids";
import type { OrganizationInvitation } from "@tumiki/db";

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitationId = "inv_test789" as OrganizationInvitationId;

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
  $transaction: MockedFunction<
    (callback: (tx: MockTransaction) => Promise<unknown>) => Promise<unknown>
  >;
  $runWithoutRLS: MockedFunction<
    (fn: (db: unknown) => Promise<unknown>) => Promise<unknown>
  >;
};

describe("cancelInvitation（EE版）", () => {
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
          organizationId: mockOrganizationId,
          organizationSlug: "test-org",
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as unknown as ProtectedContext["session"],
      currentOrg: {
        id: mockOrganizationId,
        slug: "test-org",
        createdBy: mockUserId,
        isPersonal: false,
        roles: ["Admin"], // 管理者権限を持つ
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

  test("管理者が招待をキャンセルできる", async () => {
    const now = new Date();

    // 既存の招待データをモック
    const existingInvitation: OrganizationInvitation = {
      id: mockInvitationId,
      organizationId: mockOrganizationId,
      email: "invited@example.com",
      token: "token123",
      invitedBy: mockUserId,
      roles: ["Member"],
      expires: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };
    mockTx.organizationInvitation.findFirst.mockResolvedValue(
      existingInvitation,
    );

    // 削除操作をモック
    mockTx.organizationInvitation.delete.mockResolvedValue(existingInvitation);

    const result = await cancelInvitation({
      input: {
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
    // 招待が見つからない
    mockTx.organizationInvitation.findFirst.mockResolvedValue(null);

    await expect(
      cancelInvitation({
        input: {
          invitationId: mockInvitationId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("管理者でないユーザーはエラーになる", async () => {
    // 管理者でないコンテキストを作成（rolesにOwner/Adminが含まれない）
    const nonAdminCtx: typeof mockCtx = {
      ...mockCtx,
      currentOrg: {
        ...mockCtx.currentOrg,
        roles: ["Member"], // 管理者権限なし
      },
    };

    await expect(
      cancelInvitation({
        input: {
          invitationId: mockInvitationId,
        },
        ctx: nonAdminCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("トランザクション内でのエラーが適切に処理される", async () => {
    // トランザクションでエラーが発生
    mockDb.$transaction.mockRejectedValue(new Error("Database error"));

    await expect(
      cancelInvitation({
        input: {
          invitationId: mockInvitationId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });
});
