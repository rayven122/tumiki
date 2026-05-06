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
  targetUser: { id: string; role: Role; isActive: boolean } | null;
  remainingActiveSystemAdmins?: number;
}) => {
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue(targetUser),
      count: vi.fn().mockResolvedValue(remainingActiveSystemAdmins),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...targetUser,
          ...data,
          name: "Target User",
          email: "target@example.com",
          lastLoginAt: null,
          createdAt: new Date("2026-05-06T00:00:00.000Z"),
          _count: { groupMemberships: 0 },
        }),
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
});
