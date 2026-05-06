import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Role } from "@tumiki/internal-db";
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
  ): Promise<T> => callback(tx);
  const db = {
    $transaction: vi.fn(transaction),
  } as unknown as Context["db"];

  return { db, tx };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usersRouter", () => {
  describe("list", () => {
    test("ユーザーごとの監査ログ数と利用MCP数を返す", async () => {
      const createdAt = new Date("2026-05-06T00:00:00.000Z");
      const findMany = vi.fn().mockResolvedValue([
        {
          id: "user-001",
          name: "Admin User",
          email: "admin@example.com",
          role: Role.SYSTEM_ADMIN,
          isActive: true,
          lastLoginAt: null,
          createdAt,
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
          _count: {
            desktopAuditLogs: 1,
            externalIdentities: 0,
            groupMemberships: 0,
          },
        },
      ]);
      const groupBy = vi.fn().mockResolvedValue([
        { userId: "user-001", mcpServerId: "github", _count: { _all: 2 } },
        { userId: "user-001", mcpServerId: "slack", _count: { _all: 1 } },
        { userId: "user-002", mcpServerId: "github", _count: { _all: 1 } },
      ]);
      const caller = buildCaller({
        user: { findMany },
        desktopAuditLog: { groupBy },
      } as unknown as Context["db"]);

      const result = await caller.list({ role: "all", isActive: "all" });

      const [findManyArgs] = findMany.mock.calls[0] as [
        {
          select: {
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
      expect(findManyArgs.select._count.select).toStrictEqual({
        desktopAuditLogs: true,
        externalIdentities: true,
        groupMemberships: true,
      });
      expect(groupBy).toHaveBeenCalledWith({
        by: ["userId", "mcpServerId"],
        where: { userId: { in: ["user-001", "user-002"] } },
        _count: { _all: true },
      });
      expect(result).toMatchObject([
        {
          id: "user-001",
          usage: { auditLogCount: 3, mcpServerCount: 2 },
        },
        {
          id: "user-002",
          usage: { auditLogCount: 1, mcpServerCount: 1 },
        },
      ]);
    });

    test("対象ユーザーがいない場合はMCP利用集計を省略する", async () => {
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
      const { db, tx } = buildDb({
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
    });

    test("自分自身は無効化できない", async () => {
      const { db, tx } = buildDb({
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
  });

  describe("deleteUser", () => {
    test("Tumikiで追加されたアクセス停止中ユーザーを削除できる", async () => {
      const { db, tx } = buildDb({
        targetUser: {
          id: "user-001",
          role: Role.USER,
          isActive: false,
          externalIdentityCount: 0,
        },
      });
      const caller = buildCaller(db);

      await expect(caller.deleteUser({ userId: "user-001" })).resolves.toEqual({
        id: "user-001",
      });
      expect(tx.user.delete).toHaveBeenCalledWith({
        where: { id: "user-001" },
        select: { id: true },
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

    test("自分自身は削除できない", async () => {
      const { db, tx } = buildDb({
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
      expect(tx.user.delete).not.toHaveBeenCalled();
    });
  });
});
