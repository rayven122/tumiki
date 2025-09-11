/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { getInvitations } from "./getInvitations";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";
const mockInvitedUserId = "user_invited789";

describe("getInvitations", () => {
  let mockCtx: ProtectedContext;

  beforeEach(() => {
    const mockDb = {
      organizationMember: {
        findFirst: vi.fn(),
      },
      organizationInvitation: {
        findMany: vi.fn(),
      },
    };
    
    mockCtx = {
      db: mockDb,
      session: {
        user: {
          id: mockUserId,
          email: "test@example.com",
        },
      },
    } as unknown as ProtectedContext;
  });

  test("管理者が招待一覧を取得できる", async () => {
    // 管理者権限のあるメンバーをモック
    vi.mocked(mockCtx.db.organizationMember.findFirst).mockResolvedValue({
      id: "member1",
      organizationId: mockOrganizationId,
      userId: mockUserId,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1日前

    // 招待データをモック
    vi.mocked(mockCtx.db.organizationInvitation.findMany).mockResolvedValue([
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
      } as any,
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
      } as any,
    ]);

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
    // 管理者権限のないメンバーをモック
    vi.mocked(mockCtx.db.organizationMember.findFirst).mockResolvedValue({
      id: "member1",
      organizationId: mockOrganizationId,
      userId: mockUserId,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      getInvitations({
        input: { organizationId: mockOrganizationId },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);
  });

  test("招待がない場合は空の配列を返す", async () => {
    // 管理者権限のあるメンバーをモック
    vi.mocked(mockCtx.db.organizationMember.findFirst).mockResolvedValue({
      id: "member1",
      organizationId: mockOrganizationId,
      userId: mockUserId,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 招待がない状態をモック
    vi.mocked(mockCtx.db.organizationInvitation.findMany).mockResolvedValue([]);

    const result = await getInvitations({
      input: { organizationId: mockOrganizationId },
      ctx: mockCtx,
    });

    expect(result).toStrictEqual([]);
  });
});
