import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { OrgUnitSource, Prisma, Role } from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { orgUnitsRouter } from "../org-units";
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
  orgUnitsRouter.createCaller({
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

describe("orgUnitsRouter", () => {
  test("listUsersは取得上限を設定する", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const caller = buildCaller({
      userOrgUnitMembership: { findMany },
    } as unknown as Context["db"]);

    await expect(
      caller.listUsers({ orgUnitId: "org-001" }),
    ).resolves.toStrictEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 }),
    );
  });

  test("updateParentは親と子孫のpathを更新する", async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({ id: "child", path: "/parent/department:child" });
    const executeRaw = vi.fn().mockResolvedValue(1);
    const tx = {
      $executeRaw: executeRaw,
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "child",
            externalId: "department:child",
            path: "/child",
            source: OrgUnitSource.MANUAL,
          })
          .mockResolvedValueOnce({
            id: "parent",
            path: "/parent",
          }),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.updateParent({ orgUnitId: "child", parentId: "parent" }),
    ).resolves.toStrictEqual({ id: "child", path: "/parent/department:child" });
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: "child" },
      data: { parentId: "parent", path: "/parent/department:child" },
    });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  test("updateParentはルートへ移動できる", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "child", path: "/manual:child" });
    const executeRaw = vi.fn().mockResolvedValue(0);
    const tx = {
      $executeRaw: executeRaw,
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "child",
          externalId: "manual:child",
          path: "/parent/child",
          source: OrgUnitSource.MANUAL,
        }),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.updateParent({ orgUnitId: "child", parentId: null }),
    ).resolves.toStrictEqual({ id: "child", path: "/manual:child" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "child" },
      data: { parentId: null, path: "/manual:child" },
    });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  test("updateParentは自分自身への移動をBAD_REQUESTにする", async () => {
    const caller = buildCaller({} as Context["db"]);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "child", parentId: "child" }),
      "BAD_REQUEST",
    );
  });

  test("updateParentは子孫配下への移動をBAD_REQUESTにする", async () => {
    const tx = {
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "parent",
            externalId: "manual:parent",
            path: "/parent",
            source: OrgUnitSource.MANUAL,
          })
          .mockResolvedValueOnce({
            id: "child",
            path: "/parent/child",
          }),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "parent", parentId: "child" }),
      "BAD_REQUEST",
    );
  });

  test("updateParentは存在しない親をNOT_FOUNDにする", async () => {
    const tx = {
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "child",
            externalId: "manual:child",
            path: "/child",
            source: OrgUnitSource.MANUAL,
          })
          .mockResolvedValueOnce(null),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "child", parentId: "missing" }),
      "NOT_FOUND",
    );
  });

  test("updateParentは存在しない部署をNOT_FOUNDにする", async () => {
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "missing", parentId: null }),
      "NOT_FOUND",
    );
  });

  test("updateParentはSCIM部署を変更できない", async () => {
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "scim-child",
          externalId: "department:child",
          path: "/child",
          source: OrgUnitSource.SCIM,
        }),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "scim-child", parentId: null }),
      "BAD_REQUEST",
    );
  });

  test("createManualOrgUnitは手動部署を作成する", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "manual-org",
      name: "AI推進室",
      source: OrgUnitSource.MANUAL,
      parentId: "parent",
      path: "/parent/manual:generated",
      memberships: [],
      permissions: [],
    });
    const caller = buildCaller({
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "parent", path: "/parent" }),
        create,
      },
    } as unknown as Context["db"]);

    await expect(
      caller.createManualOrgUnit({ name: " AI推進室 ", parentId: "parent" }),
    ).resolves.toMatchObject({
      id: "manual-org",
      source: OrgUnitSource.MANUAL,
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(create.mock.calls)).toContain('"name":"AI推進室"');
    expect(JSON.stringify(create.mock.calls)).toContain('"source":"MANUAL"');
    expect(JSON.stringify(create.mock.calls)).toContain('"parentId":"parent"');
  });

  test("createManualOrgUnitは存在しない親をNOT_FOUNDにする", async () => {
    const create = vi.fn();
    const caller = buildCaller({
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.createManualOrgUnit({ name: "AI推進室", parentId: "missing" }),
      "NOT_FOUND",
    );
    expect(create).not.toHaveBeenCalled();
  });

  test("updateManualOrgUnitは手動部署の名称と親を更新する", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "child",
      name: "更新後",
      source: OrgUnitSource.MANUAL,
      path: "/parent/manual:child",
      memberships: [],
      permissions: [],
    });
    const executeRaw = vi.fn().mockResolvedValue(1);
    const tx = {
      $executeRaw: executeRaw,
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "child",
            externalId: "manual:child",
            path: "/old/manual:child",
            source: OrgUnitSource.MANUAL,
          })
          .mockResolvedValueOnce({ id: "parent", path: "/parent" }),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.updateManualOrgUnit({
        orgUnitId: "child",
        name: "更新後",
        parentId: "parent",
      }),
    ).resolves.toMatchObject({ id: "child", name: "更新後" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "child" },
        data: {
          name: "更新後",
          parentId: "parent",
          path: "/parent/manual:child",
        },
      }),
    );
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  test("updateManualOrgUnitはSCIM部署を変更できない", async () => {
    const update = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "scim-child",
          externalId: "department:child",
          path: "/child",
          source: OrgUnitSource.SCIM,
        }),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateManualOrgUnit({
        orgUnitId: "scim-child",
        name: "更新後",
        parentId: null,
      }),
      "BAD_REQUEST",
    );
    expect(update).not.toHaveBeenCalled();
  });

  test("deleteManualOrgUnitは子部署がある部署を削除できない", async () => {
    const del = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "parent",
          source: OrgUnitSource.MANUAL,
          _count: { children: 1 },
        }),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.deleteManualOrgUnit({ orgUnitId: "parent" }),
      "BAD_REQUEST",
    );
    expect(del).not.toHaveBeenCalled();
  });

  test("deleteManualOrgUnitは手動部署を削除できる", async () => {
    const del = vi.fn().mockResolvedValue({ id: "manual-org" });
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "manual-org",
          source: OrgUnitSource.MANUAL,
          _count: { children: 0 },
        }),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.deleteManualOrgUnit({ orgUnitId: "manual-org" }),
    ).resolves.toStrictEqual({ id: "manual-org" });
    expect(del).toHaveBeenCalledWith({
      where: { id: "manual-org" },
      select: { id: true },
    });
  });

  test("addMemberは手動部署に有効ユーザーを追加できる", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "membership-001",
      isPrimary: false,
      user: { id: "user-001", name: "User", email: "user@example.com" },
    });
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({ source: OrgUnitSource.MANUAL }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "user-001", isActive: true }),
      },
      userOrgUnitMembership: {
        create,
        updateMany: vi.fn(),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.addMember({ orgUnitId: "manual-org", userId: "user-001" }),
    ).resolves.toMatchObject({ id: "membership-001" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          orgUnitId: "manual-org",
          userId: "user-001",
          isPrimary: false,
        },
      }),
    );
  });

  test("addMemberはinactive userを追加できない", async () => {
    const create = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({ source: OrgUnitSource.MANUAL }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "user-001", isActive: false }),
      },
      userOrgUnitMembership: {
        create,
        updateMany: vi.fn(),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.addMember({ orgUnitId: "manual-org", userId: "user-001" }),
      "BAD_REQUEST",
    );
    expect(create).not.toHaveBeenCalled();
  });

  test("addMemberは重複membershipをCONFLICTにする", async () => {
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({ source: OrgUnitSource.MANUAL }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "user-001", isActive: true }),
      },
      userOrgUnitMembership: {
        updateMany: vi.fn(),
        create: vi.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        ),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.addMember({ orgUnitId: "manual-org", userId: "user-001" }),
      "CONFLICT",
    );
  });

  test("removeMemberはSCIM部署のmembershipを削除できない", async () => {
    const del = vi.fn();
    const tx = {
      userOrgUnitMembership: {
        findUnique: vi.fn().mockResolvedValue({
          id: "membership-001",
          orgUnit: { source: OrgUnitSource.SCIM },
        }),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.removeMember({ membershipId: "membership-001" }),
      "BAD_REQUEST",
    );
    expect(del).not.toHaveBeenCalled();
  });
});
