import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { type OrganizationId } from "@/schema/ids";
import { type Db } from "@tumiki/db/server";
import { type SessionData } from "@tumiki/auth";

// server-onlyモジュールをモック
vi.mock("server-only", () => ({}));

// tRPCモジュールをモック
vi.mock("@/server/api/trpc", () => ({
  protectedProcedure: {},
}));

// データベースクライアントをモック（暗号化ミドルウェアを回避）
vi.mock("@tumiki/db/server", () => ({
  db: {},
}));

import { setDefaultOrganization } from "./setDefaultOrganization";
import { type ProtectedContext } from "@/server/api/trpc";

// モック用のデータ
const mockUserId = "user_123";
const mockOrganizationId = "org_456" as OrganizationId;
const mockDeletedOrganizationId = "org_deleted" as OrganizationId;
const mockNonMemberOrganizationId = "org_non_member" as OrganizationId;

// モック用のヘルパー関数
const mockFindFirst = vi.fn();
const mockUserUpdate = vi.fn();

// モックコンテキストの作成
const createMockContext = (): ProtectedContext => {
  const mockSession: SessionData = {
    user: {
      sub: mockUserId,
      email: undefined,
      emailVerified: undefined,
      name: undefined,
      image: undefined,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    tokenSet: {
      accessToken: "mock_access_token",
      idToken: "mock_id_token",
      refreshToken: "mock_refresh_token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
    internal: {
      sid: "mock_session_id",
      createdAt: Math.floor(Date.now() / 1000),
    },
  };

  const mockDb = {
    organizationMember: {
      findFirst: mockFindFirst,
    },
    user: {
      update: mockUserUpdate,
    },
  } as unknown as Db;

  const sessionWithId = {
    ...mockSession,
    user: {
      ...mockSession.user,
      id: mockUserId,
    },
  };

  return {
    db: mockDb,
    session: sessionWithId,
    currentOrganizationId: mockOrganizationId,
    headers: new Headers(),
  };
};

describe("setDefaultOrganization", () => {
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  test("有効な組織切り替えが成功する", async () => {
    // メンバーシップが存在する場合のモック
    mockFindFirst.mockResolvedValue({
      id: "member_123",
      userId: mockUserId,
      organizationId: mockOrganizationId,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUserUpdate.mockResolvedValue({
      id: mockUserId,
      defaultOrganizationId: mockOrganizationId,
      email: null,
      name: null,
      image: null,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await setDefaultOrganization({
      ctx,
      input: { organizationId: mockOrganizationId },
    });

    expect(result).toStrictEqual({
      success: true,
      defaultOrganizationId: mockOrganizationId,
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        organizationId: mockOrganizationId,
        organization: {
          isDeleted: false,
        },
      },
    });

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { defaultOrganizationId: mockOrganizationId },
    });
  });

  test("所属していない組織への切り替えが拒否される", async () => {
    // メンバーシップが存在しない場合のモック
    mockFindFirst.mockResolvedValue(null);

    await expect(
      setDefaultOrganization({
        ctx,
        input: { organizationId: mockNonMemberOrganizationId },
      }),
    ).rejects.toThrow(TRPCError);

    await expect(
      setDefaultOrganization({
        ctx,
        input: { organizationId: mockNonMemberOrganizationId },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "この組織のメンバーではありません",
    });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  test("削除済み組織への切り替えが拒否される", async () => {
    // 削除済み組織のメンバーシップをモック
    mockFindFirst.mockResolvedValue(null);

    await expect(
      setDefaultOrganization({
        ctx,
        input: { organizationId: mockDeletedOrganizationId },
      }),
    ).rejects.toThrow(TRPCError);

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  test("データベース更新エラーが適切に処理される", async () => {
    // メンバーシップは存在するが、更新が失敗する場合
    mockFindFirst.mockResolvedValue({
      id: "member_123",
      userId: mockUserId,
      organizationId: mockOrganizationId,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUserUpdate.mockRejectedValue(new Error("Database update failed"));

    await expect(
      setDefaultOrganization({
        ctx,
        input: { organizationId: mockOrganizationId },
      }),
    ).rejects.toThrow("Database update failed");
  });

  test("管理者権限を持つメンバーも組織を切り替えられる", async () => {
    // 管理者権限のメンバーシップをモック
    mockFindFirst.mockResolvedValue({
      id: "member_123",
      userId: mockUserId,
      organizationId: mockOrganizationId,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUserUpdate.mockResolvedValue({
      id: mockUserId,
      defaultOrganizationId: mockOrganizationId,
      email: null,
      name: null,
      image: null,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await setDefaultOrganization({
      ctx,
      input: { organizationId: mockOrganizationId },
    });

    expect(result).toStrictEqual({
      success: true,
      defaultOrganizationId: mockOrganizationId,
    });
  });
});
