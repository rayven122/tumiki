import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { GroupSource, Prisma, Role } from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { GROUP_LIST_LIMIT, groupsRouter } from "../groups";
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
  groupsRouter.createCaller({
    db,
    headers: new Headers(),
    session: buildSession(),
  });

const buildTransactionCaller = (tx: unknown) =>
  buildCaller({
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as Context["db"]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("groupsRouter", () => {
  test("listは表示上限超過検出用に1件多く取得する", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const caller = buildCaller({
      group: { findMany },
    } as unknown as Context["db"]);

    await expect(caller.list()).resolves.toStrictEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: GROUP_LIST_LIMIT + 1 }),
    );
  });

  test("getMembersは指定グループのメンバー一覧を返す", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "membership-001",
        userId: "user-001",
        source: GroupSource.TUMIKI,
        user: {
          id: "user-001",
          name: "Target User",
          email: "target@example.com",
        },
      },
    ]);
    const caller = buildCaller({
      userGroupMembership: { findMany },
    } as unknown as Context["db"]);

    const result = await caller.getMembers({ groupId: "group-001" });

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        id: "membership-001",
        userId: "user-001",
        source: GroupSource.TUMIKI,
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: "group-001" } }),
    );
  });

  test("getSyncLogsは指定グループの同期ログを最新順で20件取得する", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "sync-log-001",
        trigger: "SCIM",
        status: "SUCCESS",
        added: 1,
        removed: 0,
        detail: null,
        startedAt: new Date("2026-05-06T00:00:00.000Z"),
        completedAt: new Date("2026-05-06T00:00:01.000Z"),
      },
    ]);
    const caller = buildCaller({
      idpSyncLog: { findMany },
    } as unknown as Context["db"]);

    const result = await caller.getSyncLogs({ groupId: "group-001" });

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        id: "sync-log-001",
        trigger: "SCIM",
        status: "SUCCESS",
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId: "group-001" },
        orderBy: { startedAt: "desc" },
        take: 20,
      }),
    );
  });

  describe("TumikiグループCRUD", () => {
    test("Tumiki独自グループを作成できる", async () => {
      const create = vi.fn().mockResolvedValue({
        id: "group-001",
        name: "AI推進チーム",
        description: "横断チーム",
        source: GroupSource.TUMIKI,
        provider: null,
        externalId: null,
        lastSyncedAt: null,
        createdAt: new Date("2026-05-06T00:00:00.000Z"),
        updatedAt: new Date("2026-05-06T00:00:00.000Z"),
        memberships: [],
      });
      const caller = buildCaller({
        group: { create },
      } as unknown as Context["db"]);

      await expect(
        caller.createTumikiGroup({
          name: " AI推進チーム ",
          description: " 横断チーム ",
        }),
      ).resolves.toStrictEqual(
        expect.objectContaining({
          id: "group-001",
          source: GroupSource.TUMIKI,
        }),
      );
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "AI推進チーム",
            description: "横断チーム",
            source: GroupSource.TUMIKI,
            provider: null,
            externalId: null,
          },
        }),
      );
    });

    test("Tumiki独自グループ作成時にdescriptionが空文字の場合はnullにする", async () => {
      const create = vi.fn().mockResolvedValue({
        id: "group-001",
        name: "AI推進チーム",
        description: null,
        source: GroupSource.TUMIKI,
        provider: null,
        externalId: null,
        lastSyncedAt: null,
        createdAt: new Date("2026-05-06T00:00:00.000Z"),
        updatedAt: new Date("2026-05-06T00:00:00.000Z"),
        memberships: [],
      });
      const caller = buildCaller({
        group: { create },
      } as unknown as Context["db"]);

      await caller.createTumikiGroup({
        name: "AI推進チーム",
        description: "",
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "AI推進チーム",
            description: null,
            source: GroupSource.TUMIKI,
            provider: null,
            externalId: null,
          },
        }),
      );
    });

    test("Tumiki独自グループを更新できる", async () => {
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        name: "更新後",
        description: null,
        source: GroupSource.TUMIKI,
        provider: null,
        externalId: null,
        lastSyncedAt: null,
        createdAt: new Date("2026-05-06T00:00:00.000Z"),
        updatedAt: new Date("2026-05-06T00:00:00.000Z"),
        memberships: [],
      });
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
          update,
        },
      });

      await expect(
        caller.updateTumikiGroup({
          groupId: "group-001",
          name: "更新後",
          description: "",
        }),
      ).resolves.toStrictEqual(
        expect.objectContaining({ id: "group-001", name: "更新後" }),
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "group-001" },
          data: { name: "更新後", description: null },
        }),
      );
    });

    test("IdPグループは更新できない", async () => {
      const update = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.IDP }),
          update,
        },
      });

      await expectTrpcErrorCode(
        caller.updateTumikiGroup({
          groupId: "group-idp",
          name: "更新後",
          description: null,
        }),
        "BAD_REQUEST",
      );
      expect(update).not.toHaveBeenCalled();
    });

    test("存在しないグループは更新できない", async () => {
      const update = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue(null),
          update,
        },
      });

      await expectTrpcErrorCode(
        caller.updateTumikiGroup({
          groupId: "missing-group",
          name: "更新後",
          description: null,
        }),
        "NOT_FOUND",
      );
      expect(update).not.toHaveBeenCalled();
    });

    test("Tumiki独自グループの表示情報とIdP mappingを同時に更新できる", async () => {
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        name: "更新後",
        description: "説明更新",
        source: GroupSource.TUMIKI,
        provider: "scim-map",
        externalId: "external-group-001",
        lastSyncedAt: null,
        createdAt: new Date("2026-05-06T00:00:00.000Z"),
        updatedAt: new Date("2026-05-06T00:00:00.000Z"),
        memberships: [],
      });
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
          update,
        },
      });

      await expect(
        caller.updateTumikiGroupWithMapping({
          groupId: "group-001",
          name: " 更新後 ",
          description: " 説明更新 ",
          externalId: " external-group-001 ",
        }),
      ).resolves.toStrictEqual(
        expect.objectContaining({
          id: "group-001",
          name: "更新後",
          provider: "scim-map",
          externalId: "external-group-001",
        }),
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "group-001" },
          data: {
            name: "更新後",
            description: "説明更新",
            provider: "scim-map",
            externalId: "external-group-001",
          },
        }),
      );
    });

    test("Tumiki独自グループの同時更新でIdP mappingを解除できる", async () => {
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        name: "更新後",
        description: null,
        source: GroupSource.TUMIKI,
        provider: null,
        externalId: null,
        lastSyncedAt: null,
        createdAt: new Date("2026-05-06T00:00:00.000Z"),
        updatedAt: new Date("2026-05-06T00:00:00.000Z"),
        memberships: [],
      });
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
          update,
        },
      });

      await expect(
        caller.updateTumikiGroupWithMapping({
          groupId: "group-001",
          name: "更新後",
          description: "",
          externalId: "",
        }),
      ).resolves.toStrictEqual(
        expect.objectContaining({
          id: "group-001",
          provider: null,
          externalId: null,
        }),
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "更新後",
            description: null,
            provider: null,
            externalId: null,
          },
        }),
      );
    });

    test("同時更新はIdPグループを変更できない", async () => {
      const update = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.IDP }),
          update,
        },
      });

      await expectTrpcErrorCode(
        caller.updateTumikiGroupWithMapping({
          groupId: "group-idp",
          name: "更新後",
          description: null,
          externalId: "external-group-001",
        }),
        "BAD_REQUEST",
      );
      expect(update).not.toHaveBeenCalled();
    });

    test("同時更新のIdP mapping重複はCONFLICTを返す", async () => {
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
          update: vi.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              {
                code: "P2002",
                clientVersion: "test",
              },
            ),
          ),
        },
      });

      await expectTrpcErrorCode(
        caller.updateTumikiGroupWithMapping({
          groupId: "group-001",
          name: "更新後",
          description: null,
          externalId: "external-group-001",
        }),
        "CONFLICT",
      );
    });

    test("Tumiki独自グループを削除できる", async () => {
      const del = vi.fn().mockResolvedValue({ id: "group-001" });
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({
            source: GroupSource.TUMIKI,
            _count: { memberships: 0 },
          }),
          delete: del,
        },
      });

      await expect(
        caller.deleteTumikiGroup({ groupId: "group-001" }),
      ).resolves.toStrictEqual({ id: "group-001" });
      expect(del).toHaveBeenCalledWith({
        where: { id: "group-001" },
        select: { id: true },
      });
    });

    test("メンバーが残るTumiki独自グループは削除できない", async () => {
      const del = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({
            source: GroupSource.TUMIKI,
            _count: { memberships: 1 },
          }),
          delete: del,
        },
      });

      await expectTrpcErrorCode(
        caller.deleteTumikiGroup({ groupId: "group-001" }),
        "BAD_REQUEST",
      );
      expect(del).not.toHaveBeenCalled();
    });

    test("IdPグループは削除できない", async () => {
      const del = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.IDP }),
          delete: del,
        },
      });

      await expectTrpcErrorCode(
        caller.deleteTumikiGroup({ groupId: "group-idp" }),
        "BAD_REQUEST",
      );
      expect(del).not.toHaveBeenCalled();
    });

    test("存在しないグループは削除できない", async () => {
      const del = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue(null),
          delete: del,
        },
      });

      await expectTrpcErrorCode(
        caller.deleteTumikiGroup({ groupId: "missing-group" }),
        "NOT_FOUND",
      );
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe("Tumikiグループメンバー管理", () => {
    test("Tumiki独自グループに手動メンバーを追加できる", async () => {
      const create = vi.fn().mockResolvedValue({
        id: "membership-001",
        userId: "user-001",
        source: GroupSource.TUMIKI,
        user: {
          id: "user-001",
          name: "Target User",
          email: "target@example.com",
        },
      });
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-001",
            isActive: true,
          }),
        },
        userGroupMembership: { create },
      });

      await expect(
        caller.addMember({ groupId: "group-001", userId: "user-001" }),
      ).resolves.toStrictEqual(
        expect.objectContaining({
          id: "membership-001",
          source: GroupSource.TUMIKI,
        }),
      );
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            groupId: "group-001",
            userId: "user-001",
            source: GroupSource.TUMIKI,
          },
        }),
      );
    });

    test("IdPグループにはメンバーを追加できない", async () => {
      const create = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.IDP }),
        },
        user: { findUnique: vi.fn() },
        userGroupMembership: { create },
      });

      await expectTrpcErrorCode(
        caller.addMember({ groupId: "group-idp", userId: "user-001" }),
        "BAD_REQUEST",
      );
      expect(create).not.toHaveBeenCalled();
    });

    test("存在しないグループにはメンバーを追加できない", async () => {
      const create = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        user: { findUnique: vi.fn() },
        userGroupMembership: { create },
      });

      await expectTrpcErrorCode(
        caller.addMember({ groupId: "missing-group", userId: "user-001" }),
        "NOT_FOUND",
      );
      expect(create).not.toHaveBeenCalled();
    });

    test("存在しないユーザーはメンバーに追加できない", async () => {
      const create = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
        },
        user: { findUnique: vi.fn().mockResolvedValue(null) },
        userGroupMembership: { create },
      });

      await expectTrpcErrorCode(
        caller.addMember({ groupId: "group-001", userId: "missing-user" }),
        "NOT_FOUND",
      );
      expect(create).not.toHaveBeenCalled();
    });

    test("無効化されたユーザーはメンバーに追加できない", async () => {
      const create = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-001",
            isActive: false,
          }),
        },
        userGroupMembership: { create },
      });

      await expectTrpcErrorCode(
        caller.addMember({ groupId: "group-001", userId: "user-001" }),
        "BAD_REQUEST",
      );
      expect(create).not.toHaveBeenCalled();
    });

    test("重複メンバー追加はCONFLICTを返す", async () => {
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-001",
            isActive: true,
          }),
        },
        userGroupMembership: {
          create: vi.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              {
                code: "P2002",
                clientVersion: "test",
              },
            ),
          ),
        },
      });

      await expectTrpcErrorCode(
        caller.addMember({ groupId: "group-001", userId: "user-001" }),
        "CONFLICT",
      );
    });

    test("Tumiki由来メンバーシップを削除できる", async () => {
      const del = vi.fn().mockResolvedValue({ id: "membership-001" });
      const caller = buildTransactionCaller({
        userGroupMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: "membership-001",
            source: GroupSource.TUMIKI,
            group: { source: GroupSource.TUMIKI },
          }),
          delete: del,
        },
      });

      await expect(
        caller.removeMember({ membershipId: "membership-001" }),
      ).resolves.toStrictEqual({ id: "membership-001" });
      expect(del).toHaveBeenCalledWith({
        where: { id: "membership-001" },
        select: { id: true },
      });
    });

    test("存在しないメンバーシップは削除できない", async () => {
      const del = vi.fn();
      const caller = buildTransactionCaller({
        userGroupMembership: {
          findUnique: vi.fn().mockResolvedValue(null),
          delete: del,
        },
      });

      await expectTrpcErrorCode(
        caller.removeMember({ membershipId: "missing-membership" }),
        "NOT_FOUND",
      );
      expect(del).not.toHaveBeenCalled();
    });

    test("IdP由来メンバーシップは削除できない", async () => {
      const del = vi.fn();
      const caller = buildTransactionCaller({
        userGroupMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: "membership-idp",
            source: GroupSource.IDP,
            group: { source: GroupSource.TUMIKI },
          }),
          delete: del,
        },
      });

      await expectTrpcErrorCode(
        caller.removeMember({ membershipId: "membership-idp" }),
        "BAD_REQUEST",
      );
      expect(del).not.toHaveBeenCalled();
    });

    test("IdPグループのTumiki由来メンバーシップも削除できない", async () => {
      const del = vi.fn();
      const caller = buildTransactionCaller({
        userGroupMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: "membership-tumiki",
            source: GroupSource.TUMIKI,
            group: { source: GroupSource.IDP },
          }),
          delete: del,
        },
      });

      await expectTrpcErrorCode(
        caller.removeMember({ membershipId: "membership-tumiki" }),
        "BAD_REQUEST",
      );
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe("updateIdpMapping", () => {
    test("Tumiki作成グループにIdP mappingを設定できる", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ source: GroupSource.TUMIKI });
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        provider: "scim-map",
        externalId: "external-group-001",
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      const caller = buildTransactionCaller({
        group: { findUnique, update },
      });

      await expect(
        caller.updateIdpMapping({
          groupId: "group-001",
          externalId: " external-group-001 ",
        }),
      ).resolves.toStrictEqual({
        id: "group-001",
        provider: "scim-map",
        externalId: "external-group-001",
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: "group-001" },
        data: {
          provider: "scim-map",
          externalId: "external-group-001",
        },
        select: {
          id: true,
          provider: true,
          externalId: true,
          updatedAt: true,
        },
      });
    });

    test("Tumiki作成グループのIdP mappingを解除できる", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ source: GroupSource.TUMIKI });
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        provider: null,
        externalId: null,
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      const caller = buildTransactionCaller({
        group: { findUnique, update },
      });

      await expect(
        caller.updateIdpMapping({
          groupId: "group-001",
          externalId: null,
        }),
      ).resolves.toStrictEqual({
        id: "group-001",
        provider: null,
        externalId: null,
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: "group-001" },
        data: {
          provider: null,
          externalId: null,
        },
        select: {
          id: true,
          provider: true,
          externalId: true,
          updatedAt: true,
        },
      });
    });

    test("SCIMグループにはIdP mappingを設定できない", async () => {
      const update = vi.fn();
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.IDP }),
          update,
        },
      });

      await expectTrpcErrorCode(
        caller.updateIdpMapping({
          groupId: "scim-group-001",
          externalId: "external-group-001",
        }),
        "BAD_REQUEST",
      );
      expect(update).not.toHaveBeenCalled();
    });

    test("存在しないグループはNOT_FOUNDを返す", async () => {
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      });

      await expectTrpcErrorCode(
        caller.updateIdpMapping({
          groupId: "missing-group",
          externalId: "external-group-001",
        }),
        "NOT_FOUND",
      );
    });

    test("IdP mappingの重複はCONFLICTを返す", async () => {
      const caller = buildTransactionCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
          update: vi.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              {
                code: "P2002",
                clientVersion: "test",
              },
            ),
          ),
        },
      });

      await expectTrpcErrorCode(
        caller.updateIdpMapping({
          groupId: "group-001",
          externalId: "external-group-001",
        }),
        "CONFLICT",
      );
    });
  });
});
