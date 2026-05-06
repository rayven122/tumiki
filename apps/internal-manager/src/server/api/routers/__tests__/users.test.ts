import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma, Role } from "@tumiki/internal-db";
import { USER_LIST_LIMIT } from "@/lib/user-management";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { usersRouter } from "../users";
import { expectTrpcErrorCode } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("~/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/server/api/trpc", async () => {
  const actual = await vi.importActual<typeof TrpcModule>("../../trpc");
  return actual;
});

const buildSession = (): Session => ({
  user: {
    id: "admin-001",
    sub: "admin-001",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
    role: Role.SYSTEM_ADMIN,
    tumiki: null,
  },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

const buildCaller = (db: Context["db"]) =>
  usersRouter.createCaller({
    db,
    headers: new Headers(),
    session: buildSession(),
  });

const buildDb = ({
  targetUser,
  remainingActiveSystemAdmins = 1,
}: {
  targetUser: {
    id: string;
    role: Role;
    isActive: boolean;
    externalIdentityCount?: number;
  } | null;
  remainingActiveSystemAdmins?: number;
}) => {
  const selectedTargetUser = targetUser
    ? {
        ...targetUser,
        _count: { externalIdentities: targetUser.externalIdentityCount ?? 0 },
      }
    : null;
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue(selectedTargetUser),
      count: vi.fn().mockResolvedValue(remainingActiveSystemAdmins),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...selectedTargetUser,
          ...data,
          name: "Target User",
          email: "target@example.com",
          lastLoginAt: null,
          createdAt: new Date("2026-05-06T00:00:00.000Z"),
          externalIdentities: [],
          _count: {
            desktopAuditLogs: 0,
            externalIdentities: 0,
            groupMemberships: 0,
          },
        }),
      ),
      delete: vi
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve({ id: where.id }),
        ),
    },
  };

  const transaction = async <T>(
    callback: (transactionClient: typeof tx) => Promise<T>,
    _options?: unknown,
  ): Promise<T> => callback(tx);
  const transactionMock = vi.fn(transaction);
  const db = {
    $transaction: transactionMock,
  } as unknown as Context["db"];

  return { db, tx, transactionMock };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usersRouter", () => {
  describe("list", () => {
    test("ユーザーごとの同期元と最終利用日時を返す", async () => {
      const createdAt = new Date("2026-05-06T00:00:00.000Z");
      const occurredAt = new Date("2026-05-06T01:23:00.000Z");
      const findMany = vi.fn().mockResolvedValue([
        {
          id: "user-001",
          name: "Admin User",
          email: "admin@example.com",
          role: Role.SYSTEM_ADMIN,
          isActive: true,
          lastLoginAt: null,
          createdAt,
          externalIdentities: [{ provider: "scim" }],
          _count: {
            desktopAuditLogs: 3,
            externalIdentities: 1,
            groupMemberships: 2,
          },
        },
        {
          id: "user-002",
          name: "Member User",
          email: "member@example.com",
          role: Role.USER,
          isActive: true,
          lastLoginAt: null,
          createdAt,
          externalIdentities: [],
          _count: {
            desktopAuditLogs: 1,
            externalIdentities: 0,
            groupMemberships: 0,
          },
        },
      ]);
      const groupBy = vi
        .fn()
        .mockResolvedValue([{ userId: "user-001", _max: { occurredAt } }]);
      const caller = buildCaller({
        user: { findMany },
        desktopAuditLog: { groupBy },
      } as unknown as Context["db"]);

      const result = await caller.list({ role: "all", isActive: "all" });

      const [findManyArgs] = findMany.mock.calls[0] as [
        {
          take: number;
          select: {
            externalIdentities: {
              select: { provider: boolean };
              orderBy: { lastSyncedAt: string };
              take: number;
            };
            _count: {
              select: {
                desktopAuditLogs: boolean;
                externalIdentities: boolean;
                groupMemberships: boolean;
              };
            };
          };
        },
      ];
      expect(findManyArgs.select.externalIdentities).toStrictEqual({
        select: { provider: true },
        orderBy: { lastSyncedAt: "desc" },
        take: 1,
      });
      expect(findManyArgs.select._count.select).toStrictEqual({
        desktopAuditLogs: true,
        externalIdentities: true,
        groupMemberships: true,
      });
      expect(findManyArgs.take).toBe(USER_LIST_LIMIT);
      expect(groupBy).toHaveBeenCalledWith({
        by: ["userId"],
        where: { userId: { in: ["user-001", "user-002"] } },
        _max: { occurredAt: true },
      });
      expect(result).toMatchObject([
        {
          id: "user-001",
          externalIdentities: [{ provider: "scim" }],
          lastUsedAt: occurredAt,
        },
        {
          id: "user-002",
          externalIdentities: [],
          lastUsedAt: null,
        },
      ]);
    });

    test("対象ユーザーがいない場合は最終利用集計を省略する", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const groupBy = vi.fn();
      const caller = buildCaller({
        user: { findMany },
        desktopAuditLog: { groupBy },
      } as unknown as Context["db"]);

      await expect(
        caller.list({ role: "USER", isActive: "true" }),
      ).resolves.toStrictEqual([]);
      expect(groupBy).not.toHaveBeenCalled();
    });
  });

  describe("updateActive", () => {
    test("ユーザーを無効化できる", async () => {
      const { db, tx, transactionMock } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: true,
        },
      });
      const caller = buildCaller(db);

      await expect(
        caller.updateActive({ userId: "user-001", isActive: false }),
      ).resolves.toMatchObject({
        id: "user-001",
        isActive: false,
      });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-001" },
          data: { isActive: false },
        }),
      );
      expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    test("ユーザーを再有効化できる", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: false,
        },
      });
      const caller = buildCaller(db);

      await expect(
        caller.updateActive({ userId: "user-001", isActive: true }),
      ).resolves.toMatchObject({
        id: "user-001",
        isActive: true,
      });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-001" },
          data: { isActive: true },
        }),
      );
    });

    test("自分自身のアクセス状態は変更できない", async () => {
      const { db, tx, transactionMock } = buildDb({
        targetUser: {
          id: "admin-001",
          role: Role.SYSTEM_ADMIN,
          isActive: true,
        },
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.updateActive({ userId: "admin-001", isActive: false }),
        "BAD_REQUEST",
      );
      await expectTrpcErrorCode(
        caller.updateActive({ userId: "admin-001", isActive: true }),
        "BAD_REQUEST",
      );
      expect(transactionMock).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    test("最後の有効なSYSTEM_ADMINは無効化できない", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "admin-002",
          role: Role.SYSTEM_ADMIN,
          isActive: true,
        },
        remainingActiveSystemAdmins: 0,
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.updateActive({ userId: "admin-002", isActive: false }),
        "BAD_REQUEST",
      );
      expect(tx.user.count).toHaveBeenCalledWith({
        where: {
          role: Role.SYSTEM_ADMIN,
          isActive: true,
          id: { not: "admin-002" },
        },
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    test("存在しないユーザーはNOT_FOUNDになる", async () => {
      const { db, tx } = buildDb({ targetUser: null });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.updateActive({ userId: "missing-user", isActive: false }),
        "NOT_FOUND",
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe("updateRole", () => {
    test("ユーザーをSYSTEM_ADMINへ昇格できる", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: true,
        },
      });
      const caller = buildCaller(db);

      await expect(
        caller.updateRole({ userId: "user-001", role: Role.SYSTEM_ADMIN }),
      ).resolves.toMatchObject({
        id: "user-001",
        role: Role.SYSTEM_ADMIN,
      });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-001" },
          data: { role: Role.SYSTEM_ADMIN },
        }),
      );
    });

    test("自分自身は降格できない", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "admin-001",
          role: Role.SYSTEM_ADMIN,
          isActive: true,
        },
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.updateRole({ userId: "admin-001", role: Role.USER }),
        "BAD_REQUEST",
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    test("最後の有効なSYSTEM_ADMINはUSERに降格できない", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "admin-002",
          role: Role.SYSTEM_ADMIN,
          isActive: true,
        },
        remainingActiveSystemAdmins: 0,
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.updateRole({ userId: "admin-002", role: Role.USER }),
        "BAD_REQUEST",
      );
      expect(tx.user.count).toHaveBeenCalledWith({
        where: {
          role: Role.SYSTEM_ADMIN,
          isActive: true,
          id: { not: "admin-002" },
        },
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    test("非アクティブなSYSTEM_ADMINは有効管理者数を確認せず降格できる", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "admin-002",
          role: Role.SYSTEM_ADMIN,
          isActive: false,
        },
        remainingActiveSystemAdmins: 0,
      });
      const caller = buildCaller(db);

      await expect(
        caller.updateRole({ userId: "admin-002", role: Role.USER }),
      ).resolves.toMatchObject({
        id: "admin-002",
        role: Role.USER,
      });
      expect(tx.user.count).not.toHaveBeenCalled();
    });

    test("存在しないユーザーはNOT_FOUNDになる", async () => {
      const { db, tx } = buildDb({ targetUser: null });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.updateRole({ userId: "missing-user", role: Role.USER }),
        "NOT_FOUND",
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    test("Tumikiで追加されたアクセス停止中ユーザーを削除できる", async () => {
      const { db, tx, transactionMock } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: false,
          externalIdentityCount: 0,
        },
      });
      const caller = buildCaller(db);

      await expect(
        caller.deleteUser({ userId: "user-001" }),
      ).resolves.toStrictEqual({ id: "user-001" });
      expect(tx.user.delete).toHaveBeenCalledWith({
        where: { id: "user-001" },
        select: { id: true },
      });
      expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    test("利用中ユーザーは削除できない", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: true,
          externalIdentityCount: 0,
        },
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.deleteUser({ userId: "user-001" }),
        "BAD_REQUEST",
      );
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    test("IdP同期ユーザーは削除できない", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: false,
          externalIdentityCount: 1,
        },
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.deleteUser({ userId: "user-001" }),
        "BAD_REQUEST",
      );
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    test("最後のSYSTEM_ADMINは削除できない", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "admin-002",
          role: Role.SYSTEM_ADMIN,
          isActive: false,
          externalIdentityCount: 0,
        },
        remainingActiveSystemAdmins: 0,
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.deleteUser({ userId: "admin-002" }),
        "BAD_REQUEST",
      );
      expect(tx.user.count).toHaveBeenCalledWith({
        where: {
          role: Role.SYSTEM_ADMIN,
          isActive: true,
          id: { not: "admin-002" },
        },
      });
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    test("自分自身は削除できない", async () => {
      const { db, tx, transactionMock } = buildDb({
        targetUser: {
          id: "admin-001",
          role: Role.SYSTEM_ADMIN,
          isActive: false,
          externalIdentityCount: 0,
        },
      });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.deleteUser({ userId: "admin-001" }),
        "BAD_REQUEST",
      );
      expect(transactionMock).not.toHaveBeenCalled();
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    test("存在しないユーザーはNOT_FOUNDになる", async () => {
      const { db, tx } = buildDb({ targetUser: null });
      const caller = buildCaller(db);

      await expectTrpcErrorCode(
        caller.deleteUser({ userId: "missing-user" }),
        "NOT_FOUND",
      );
      expect(tx.user.delete).not.toHaveBeenCalled();
    });
  });
});
