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
            source: OrgUnitSource.MANUAL,
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
            source: OrgUnitSource.MANUAL,
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

  test("updateParentはSCIM部署配下へ移動できない", async () => {
    const update = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "manual-child",
            externalId: "manual:child",
            path: "/child",
            source: OrgUnitSource.MANUAL,
          })
          .mockResolvedValueOnce({
            id: "scim-parent",
            path: "/scim-parent",
            source: OrgUnitSource.SCIM,
          }),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({
        orgUnitId: "manual-child",
        parentId: "scim-parent",
      }),
      "BAD_REQUEST",
    );
    expect(update).not.toHaveBeenCalled();
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
        findUnique: vi.fn().mockResolvedValue({
          id: "parent",
          path: "/parent",
          source: OrgUnitSource.MANUAL,
        }),
        create,
      },
    } as unknown as Context["db"]);

    await expect(
      caller.createManualOrgUnit({ name: " AI推進室 ", parentId: "parent" }),
    ).resolves.toStrictEqual(
      expect.objectContaining({
        id: "manual-org",
        source: OrgUnitSource.MANUAL,
      }),
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "AI推進室",
          externalId: expect.stringMatching(/^manual:/) as string,
          source: OrgUnitSource.MANUAL,
          parentId: "parent",
          path: expect.stringMatching(/^\/parent\/manual:/) as string,
        },
      }),
    );
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

  test("createManualOrgUnitは親なしでルート部署を作成できる", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "manual-root",
      name: "AI推進室",
      source: OrgUnitSource.MANUAL,
      parentId: null,
      path: "/manual:generated",
      memberships: [],
      permissions: [],
    });
    const caller = buildCaller({
      orgUnit: {
        create,
      },
    } as unknown as Context["db"]);

    await expect(
      caller.createManualOrgUnit({ name: "AI推進室" }),
    ).resolves.toStrictEqual(
      expect.objectContaining({
        id: "manual-root",
        parentId: null,
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "AI推進室",
          externalId: expect.stringMatching(/^manual:/) as string,
          parentId: null,
          source: OrgUnitSource.MANUAL,
          path: expect.stringMatching(/^\/manual:/) as string,
        },
      }),
    );
  });

  test("createManualOrgUnitはSCIM部署配下に作成できない", async () => {
    const create = vi.fn();
    const caller = buildCaller({
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "scim-parent",
          path: "/scim-parent",
          source: OrgUnitSource.SCIM,
        }),
        create,
      },
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.createManualOrgUnit({ name: "AI推進室", parentId: "scim-parent" }),
      "BAD_REQUEST",
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
          .mockResolvedValueOnce({
            id: "parent",
            path: "/parent",
            source: OrgUnitSource.MANUAL,
          }),
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
    ).resolves.toStrictEqual(
      expect.objectContaining({ id: "child", name: "更新後" }),
    );
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

  test("updateManualOrgUnitは自分自身への移動をBAD_REQUESTにする", async () => {
    const caller = buildCaller({} as Context["db"]);

    await expectTrpcErrorCode(
      caller.updateManualOrgUnit({
        orgUnitId: "child",
        name: "更新後",
        parentId: "child",
      }),
      "BAD_REQUEST",
    );
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

  test("updateManualOrgUnitはSCIM部署配下へ移動できない", async () => {
    const update = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "manual-child",
            externalId: "manual:child",
            path: "/child",
            source: OrgUnitSource.MANUAL,
          })
          .mockResolvedValueOnce({
            id: "scim-parent",
            path: "/scim-parent",
            source: OrgUnitSource.SCIM,
          }),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateManualOrgUnit({
        orgUnitId: "manual-child",
        name: "更新後",
        parentId: "scim-parent",
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

  test("deleteManualOrgUnitは存在しない部署をNOT_FOUNDにする", async () => {
    const del = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.deleteManualOrgUnit({ orgUnitId: "missing-org" }),
      "NOT_FOUND",
    );
    expect(del).not.toHaveBeenCalled();
  });

  test("deleteManualOrgUnitはSCIM部署を削除できない", async () => {
    const del = vi.fn();
    const tx = {
      orgUnit: {
        findUnique: vi.fn().mockResolvedValue({
          id: "scim-org",
          source: OrgUnitSource.SCIM,
          _count: { children: 0 },
        }),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.deleteManualOrgUnit({ orgUnitId: "scim-org" }),
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
    ).resolves.toStrictEqual(expect.objectContaining({ id: "membership-001" }));
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

  test("addMemberはprimary指定時に既存primaryを解除して追加する", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({
      id: "membership-001",
      isPrimary: true,
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
        updateMany,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.addMember({
        orgUnitId: "manual-org",
        userId: "user-001",
        isPrimary: true,
      }),
    ).resolves.toStrictEqual(
      expect.objectContaining({ id: "membership-001", isPrimary: true }),
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-001",
        isPrimary: true,
        orgUnitId: { not: "manual-org" },
      },
      data: { isPrimary: false },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          orgUnitId: "manual-org",
          userId: "user-001",
          isPrimary: true,
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

  test("removeMemberは手動部署のmembershipを削除できる", async () => {
    const del = vi.fn().mockResolvedValue({ id: "membership-001" });
    const tx = {
      userOrgUnitMembership: {
        findUnique: vi.fn().mockResolvedValue({
          id: "membership-001",
          orgUnit: { source: OrgUnitSource.MANUAL },
        }),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.removeMember({ membershipId: "membership-001" }),
    ).resolves.toStrictEqual({ id: "membership-001" });
    expect(del).toHaveBeenCalledWith({
      where: { id: "membership-001" },
      select: { id: true },
    });
  });

  test("removeMemberは存在しないmembershipをNOT_FOUNDにする", async () => {
    const del = vi.fn();
    const tx = {
      userOrgUnitMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: del,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.removeMember({ membershipId: "missing-membership" }),
      "NOT_FOUND",
    );
    expect(del).not.toHaveBeenCalled();
  });
});
