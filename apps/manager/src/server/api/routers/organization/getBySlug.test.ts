import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { type Db } from "@tumiki/db/server";

// SessionData型定義（~/authからの依存を回避するため）
type SessionData = {
  user: {
    id: string;
    sub: string;
    email: string | null;
    name: string | null;
    image: string | null;
  };
  expires: string;
};

// server-onlyモジュールをモック
vi.mock("server-only", () => ({}));

// ~/authモジュールをモック（next-auth依存を回避）
vi.mock("~/auth", () => ({}));

// tRPCモジュールをモック
vi.mock("@/server/api/trpc", () => ({
  protectedProcedure: {},
}));

// データベースクライアントをモック（暗号化ミドルウェアを回避）
vi.mock("@tumiki/db/server", () => ({
  db: {},
}));

import { getOrganizationBySlug } from "./getBySlug";
import { type ProtectedContext } from "@/server/api/trpc";

// モック用のデータ
const mockUserId = "user_123";
const mockOrganizationId = "org_456";
const mockOrganizationSlug = "test-organization";
const mockNonExistentSlug = "non-existent-org";

// モック用のヘルパー関数
const mockFindUnique = vi.fn();

// モックコンテキストの作成
const createMockContext = (): ProtectedContext => {
  const mockSession: SessionData = {
    user: {
      id: mockUserId,
      sub: mockUserId,
      email: null,
      name: null,
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockDb = {
    organization: {
      findUnique: mockFindUnique,
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
    isCurrentOrganizationAdmin: false,
    headers: new Headers(),
  };
};

describe("getOrganizationBySlug", () => {
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  test("有効なスラッグで組織を取得できる", async () => {
    const mockOrganization = {
      id: mockOrganizationId,
      name: "Test Organization",
      slug: mockOrganizationSlug,
      isPersonal: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      createdBy: mockUserId,
      members: [
        {
          isAdmin: false,
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockOrganization);

    const result = await getOrganizationBySlug({
      ctx,
      input: { slug: mockOrganizationSlug },
    });

    expect(result).toStrictEqual({
      id: mockOrganizationId,
      name: "Test Organization",
      slug: mockOrganizationSlug,
      isPersonal: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      createdBy: mockUserId,
      isAdmin: false,
    });

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { slug: mockOrganizationSlug },
      include: {
        members: {
          where: { userId: mockUserId },
          select: {
            isAdmin: true,
          },
        },
      },
    });
  });

  test("管理者権限を持つメンバーの場合、isAdminがtrueになる", async () => {
    const mockOrganization = {
      id: mockOrganizationId,
      name: "Test Organization",
      slug: mockOrganizationSlug,
      isPersonal: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      createdBy: mockUserId,
      members: [
        {
          isAdmin: true,
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockOrganization);

    const result = await getOrganizationBySlug({
      ctx,
      input: { slug: mockOrganizationSlug },
    });

    expect(result.isAdmin).toBe(true);
  });

  test("存在しないスラッグの場合、NOT_FOUNDエラーが投げられる", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      getOrganizationBySlug({
        ctx,
        input: { slug: mockNonExistentSlug },
      }),
    ).rejects.toThrow(TRPCError);

    await expect(
      getOrganizationBySlug({
        ctx,
        input: { slug: mockNonExistentSlug },
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  });

  test("メンバーではない組織へのアクセスが拒否される", async () => {
    const mockOrganization = {
      id: mockOrganizationId,
      name: "Test Organization",
      slug: mockOrganizationSlug,
      isPersonal: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      createdBy: "another_user",
      members: [], // メンバーリストが空
    };

    mockFindUnique.mockResolvedValue(mockOrganization);

    await expect(
      getOrganizationBySlug({
        ctx,
        input: { slug: mockOrganizationSlug },
      }),
    ).rejects.toThrow(TRPCError);

    await expect(
      getOrganizationBySlug({
        ctx,
        input: { slug: mockOrganizationSlug },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "この組織にアクセスする権限がありません",
    });
  });

  test("個人組織を取得できる", async () => {
    const mockPersonalOrganization = {
      id: mockOrganizationId,
      name: "Personal Organization",
      slug: "@user-personal",
      isPersonal: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      createdBy: mockUserId,
      members: [
        {
          isAdmin: true,
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockPersonalOrganization);

    const result = await getOrganizationBySlug({
      ctx,
      input: { slug: "@user-personal" },
    });

    expect(result.isPersonal).toBe(true);
    expect(result.isAdmin).toBe(true);
  });

  test("データベースエラーが適切に処理される", async () => {
    mockFindUnique.mockRejectedValue(new Error("Database connection failed"));

    await expect(
      getOrganizationBySlug({
        ctx,
        input: { slug: mockOrganizationSlug },
      }),
    ).rejects.toThrow("Database connection failed");
  });
});
