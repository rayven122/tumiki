import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  GroupSource,
  OrgUnitSource,
  SyncStatus,
  SyncTrigger,
} from "@tumiki/internal-db";

// event-handler が呼び出すPrisma操作を最小限の型でスパイする
type UpsertArgs = {
  where: { id: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

type GroupFindUniqueResult = {
  id: string;
  memberships: { id: string }[];
} | null;

type IdpSyncLogCreateArgs = {
  data: {
    groupId: string | null;
    trigger: SyncTrigger;
    status: SyncStatus;
    added: number;
    removed: number;
    errors: number;
    detail: string | null;
    completedAt: Date;
  };
};

const mockDb = {
  user: {
    upsert: vi.fn<(args: UpsertArgs) => Promise<{ id: string }>>(),
    updateMany: vi.fn<(args: UpdateManyArgs) => Promise<{ count: number }>>(),
  },
  group: {
    upsert: vi.fn<(args: UpsertArgs) => Promise<{ id: string }>>(),
    findUnique:
      vi.fn<
        (args: { where: { id: string } }) => Promise<GroupFindUniqueResult>
      >(),
    delete:
      vi.fn<(args: { where: { id: string } }) => Promise<{ id: string }>>(),
    updateMany: vi.fn<(args: UpdateManyArgs) => Promise<{ count: number }>>(),
  },
  userGroupMembership: {
    upsert: vi.fn<(args: UpsertArgs) => Promise<{ id: string }>>(),
    deleteMany:
      vi.fn<
        (args: { where: Record<string, unknown> }) => Promise<{ count: number }>
      >(),
  },
  orgUnit: {
    upsert: vi.fn<
      (args: {
        where: {
          source_externalId: { source: OrgUnitSource; externalId: string };
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<{ id: string }>
    >(),
  },
  userOrgUnitMembership: {
    upsert: vi.fn<
      (args: {
        where: {
          userId_orgUnitId: { userId: string; orgUnitId: string };
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<{ id: string }>
    >(),
  },
  idpSyncLog: {
    create: vi.fn<(args: IdpSyncLogCreateArgs) => Promise<{ id: string }>>(),
  },
};

vi.mock("@tumiki/internal-db/server", () => ({
  db: mockDb,
}));

// SUT は vi.mock 設定後に動的 import する
const { handleDirectorySyncEvent, SCIM_PROVIDER } =
  await import("../event-handler");

const baseEnvelope = {
  directory_id: "dir-001",
  tenant: "tenant-001",
  product: "tumiki",
} as const;

const buildUserEvent = (
  type: "user.created" | "user.updated" | "user.deleted",
  overrides: Partial<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    active: boolean;
    department: string;
    manager: { value: string; displayName: string };
  }> = {},
): DirectorySyncEvent => ({
  ...baseEnvelope,
  event: type,
  data: {
    id: "user-001",
    email: "alice@example.com",
    first_name: "Alice",
    last_name: "Anderson",
    active: true,
    ...overrides,
  },
});

const buildGroupEvent = (
  type: "group.created" | "group.updated" | "group.deleted",
  overrides: Partial<{ id: string; name: string }> = {},
): DirectorySyncEvent => ({
  ...baseEnvelope,
  event: type,
  data: {
    id: "group-001",
    name: "Engineers",
    ...overrides,
  },
});

const buildUserWithGroupEvent = (
  type: "group.user_added" | "group.user_removed",
  overrides: Partial<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    active: boolean;
    group: { id: string; name: string };
  }> = {},
): DirectorySyncEvent => ({
  ...baseEnvelope,
  event: type,
  data: {
    id: "user-001",
    email: "alice@example.com",
    first_name: "Alice",
    last_name: "Anderson",
    active: true,
    group: { id: "group-001", name: "Engineers" },
    ...overrides,
  },
});

const getFirstCallArg = <T>(spy: { mock: { calls: T[][] } }): T => {
  const arg = spy.mock.calls[0]?.[0];
  if (arg === undefined) {
    throw new Error("モック関数が呼び出されませんでした");
  }
  return arg;
};

const findIdpSyncLogData = () => getFirstCallArg(mockDb.idpSyncLog.create).data;

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルトで全 DB 操作は成功扱い
  mockDb.user.upsert.mockResolvedValue({ id: "user-001" });
  mockDb.user.updateMany.mockResolvedValue({ count: 1 });
  mockDb.group.upsert.mockResolvedValue({ id: "group-001" });
  mockDb.group.findUnique.mockResolvedValue(null);
  mockDb.group.delete.mockResolvedValue({ id: "group-001" });
  mockDb.group.updateMany.mockResolvedValue({ count: 1 });
  mockDb.userGroupMembership.upsert.mockResolvedValue({ id: "mem-001" });
  mockDb.userGroupMembership.deleteMany.mockResolvedValue({ count: 1 });
  mockDb.orgUnit.upsert.mockResolvedValue({ id: "org-001" });
  mockDb.userOrgUnitMembership.upsert.mockResolvedValue({ id: "uom-001" });
  mockDb.idpSyncLog.create.mockResolvedValue({ id: "log-001" });
});

describe("handleDirectorySyncEvent", () => {
  describe("user.created", () => {
    test("Userとexternal identityをupsertし、IdpSyncLogにadded=1で記録する", async () => {
      await handleDirectorySyncEvent(buildUserEvent("user.created"));

      expect(mockDb.user.upsert).toHaveBeenCalledTimes(1);
      const args = getFirstCallArg(mockDb.user.upsert);
      expect(args.where).toStrictEqual({ id: "user-001" });
      expect(args.create).toStrictEqual({
        id: "user-001",
        email: "alice@example.com",
        name: "Alice Anderson",
        isActive: true,
        scimDepartment: null,
        scimManagerValue: null,
        scimManagerDisplayName: null,
        externalIdentities: {
          create: { provider: SCIM_PROVIDER, sub: "user-001" },
        },
      });
      expect(args.update).toStrictEqual({
        email: "alice@example.com",
        name: "Alice Anderson",
        isActive: true,
        scimDepartment: null,
        scimManagerValue: null,
        scimManagerDisplayName: null,
      });

      const log = findIdpSyncLogData();
      expect(log.trigger).toStrictEqual(SyncTrigger.SCIM);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
      expect(log.added).toStrictEqual(1);
      expect(log.removed).toStrictEqual(0);
      expect(log.errors).toStrictEqual(0);
      expect(log.groupId).toBeNull();
      expect(log.detail).toBeNull();
    });

    test("emailが空文字の場合はnullとして保存する", async () => {
      await handleDirectorySyncEvent(
        buildUserEvent("user.created", { email: "" }),
      );

      const args = getFirstCallArg(mockDb.user.upsert);
      expect(args.create.email).toBeNull();
      expect(args.update.email).toBeNull();
    });

    test("first_nameもlast_nameも空の場合はnameをnullにする", async () => {
      await handleDirectorySyncEvent(
        buildUserEvent("user.created", { first_name: "", last_name: "" }),
      );

      const args = getFirstCallArg(mockDb.user.upsert);
      expect(args.create.name).toBeNull();
      expect(args.update.name).toBeNull();
    });

    test("同じidで2回呼ばれてもupsertで冪等に処理される", async () => {
      await handleDirectorySyncEvent(buildUserEvent("user.created"));
      await handleDirectorySyncEvent(buildUserEvent("user.created"));

      expect(mockDb.user.upsert).toHaveBeenCalledTimes(2);
      expect(mockDb.idpSyncLog.create).toHaveBeenCalledTimes(2);
    });

    test("EnterpriseUserのdepartmentとmanagerを保存し、主所属部署をupsertする", async () => {
      await handleDirectorySyncEvent(
        buildUserEvent("user.created", {
          department: "Product Engineering",
          manager: { value: "manager-001", displayName: "Grace Hopper" },
        }),
      );

      const userArgs = getFirstCallArg(mockDb.user.upsert);
      expect(userArgs.create.scimDepartment).toStrictEqual(
        "Product Engineering",
      );
      expect(userArgs.create.scimManagerValue).toStrictEqual("manager-001");
      expect(userArgs.create.scimManagerDisplayName).toStrictEqual(
        "Grace Hopper",
      );
      const orgUnitArgs = getFirstCallArg(mockDb.orgUnit.upsert);
      expect(orgUnitArgs.where).toStrictEqual({
        source_externalId: {
          source: OrgUnitSource.SCIM,
          externalId: "department:product-engineering",
        },
      });
      expect(orgUnitArgs.create.name).toStrictEqual("Product Engineering");
      expect(orgUnitArgs.create.externalId).toStrictEqual(
        "department:product-engineering",
      );
      expect(orgUnitArgs.create.source).toStrictEqual(OrgUnitSource.SCIM);
      expect(orgUnitArgs.create.path).toStrictEqual(
        "/department:product-engineering",
      );
      expect(orgUnitArgs.create.lastSyncedAt).toBeInstanceOf(Date);
      expect(orgUnitArgs.update.name).toStrictEqual("Product Engineering");
      expect(orgUnitArgs.update.lastSyncedAt).toBeInstanceOf(Date);
      expect(mockDb.userOrgUnitMembership.upsert).toHaveBeenCalledWith({
        where: {
          userId_orgUnitId: { userId: "user-001", orgUnitId: "org-001" },
        },
        create: {
          userId: "user-001",
          orgUnitId: "org-001",
          isPrimary: true,
        },
        update: { isPrimary: true },
      });
    });
  });

  describe("user.updated", () => {
    test("既存ユーザーをupsertで更新する（user.created失敗後の永続失敗を防ぐ）", async () => {
      await handleDirectorySyncEvent(
        buildUserEvent("user.updated", {
          email: "alice-new@example.com",
          first_name: "Alice",
          last_name: "Smith",
          active: false,
        }),
      );

      expect(mockDb.user.upsert).toHaveBeenCalledTimes(1);
      const args = getFirstCallArg(mockDb.user.upsert);
      expect(args.update).toStrictEqual({
        email: "alice-new@example.com",
        name: "Alice Smith",
        isActive: false,
        scimDepartment: null,
        scimManagerValue: null,
        scimManagerDisplayName: null,
      });

      const log = findIdpSyncLogData();
      expect(log.added).toStrictEqual(0);
      expect(log.removed).toStrictEqual(0);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
    });
  });

  describe("user.deleted", () => {
    test("ソフト削除でisActive=falseに更新し、removedにcountを記録する", async () => {
      mockDb.user.updateMany.mockResolvedValue({ count: 1 });

      await handleDirectorySyncEvent(buildUserEvent("user.deleted"));

      expect(mockDb.user.updateMany).toHaveBeenCalledWith({
        where: { id: "user-001" },
        data: { isActive: false },
      });

      const log = findIdpSyncLogData();
      expect(log.removed).toStrictEqual(1);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
    });

    test("存在しないidでもupdateManyのcount=0でエラーにならない（冪等）", async () => {
      mockDb.user.updateMany.mockResolvedValue({ count: 0 });

      await handleDirectorySyncEvent(
        buildUserEvent("user.deleted", { id: "nonexistent" }),
      );

      const log = findIdpSyncLogData();
      expect(log.removed).toStrictEqual(0);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
    });
  });

  describe("group.created", () => {
    test("Groupをsource=IDP, provider=scimでupsertする", async () => {
      await handleDirectorySyncEvent(buildGroupEvent("group.created"));

      const args = getFirstCallArg(mockDb.group.upsert);
      expect(args.where).toStrictEqual({ id: "group-001" });
      expect(args.create.id).toStrictEqual("group-001");
      expect(args.create.name).toStrictEqual("Engineers");
      expect(args.create.source).toStrictEqual(GroupSource.IDP);
      expect(args.create.provider).toStrictEqual(SCIM_PROVIDER);
      expect(args.create.externalId).toStrictEqual("group-001");
      expect(args.create.lastSyncedAt).toBeInstanceOf(Date);
      expect(args.update.name).toStrictEqual("Engineers");
      expect(args.update.lastSyncedAt).toBeInstanceOf(Date);

      const log = findIdpSyncLogData();
      expect(log.groupId).toStrictEqual("group-001");
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
      expect(log.added).toStrictEqual(0);
      expect(log.removed).toStrictEqual(0);
    });
  });

  describe("group.updated", () => {
    test("nameとlastSyncedAtを更新する（group.created失敗後の永続失敗を防ぐ）", async () => {
      await handleDirectorySyncEvent(
        buildGroupEvent("group.updated", { name: "Engineers Renamed" }),
      );

      const args = getFirstCallArg(mockDb.group.upsert);
      expect(args.where).toStrictEqual({ id: "group-001" });
      expect(args.update.name).toStrictEqual("Engineers Renamed");
      expect(args.update.lastSyncedAt).toBeInstanceOf(Date);
      // 過去にgroup.createdが失敗していた場合のフォールバックとして create も指定されている
      expect(args.create.id).toStrictEqual("group-001");
      expect(args.create.source).toStrictEqual(GroupSource.IDP);

      const log = findIdpSyncLogData();
      expect(log.groupId).toStrictEqual("group-001");
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
      expect(log.added).toStrictEqual(0);
      expect(log.removed).toStrictEqual(0);
    });
  });

  describe("group.deleted", () => {
    test("Groupとそのメンバーシップ数をremovedに記録して削除する", async () => {
      mockDb.group.findUnique.mockResolvedValue({
        id: "group-001",
        memberships: [{ id: "mem-1" }, { id: "mem-2" }, { id: "mem-3" }],
      });

      await handleDirectorySyncEvent(buildGroupEvent("group.deleted"));

      expect(mockDb.group.findUnique).toHaveBeenCalledWith({
        where: { id: "group-001" },
        select: { id: true, memberships: { select: { id: true } } },
      });
      expect(mockDb.group.delete).toHaveBeenCalledWith({
        where: { id: "group-001" },
      });

      const log = findIdpSyncLogData();
      expect(log.groupId).toStrictEqual("group-001");
      expect(log.removed).toStrictEqual(3);
    });

    test("存在しないGroupの場合はdeleteを呼ばずSUCCESSとして処理する", async () => {
      mockDb.group.findUnique.mockResolvedValue(null);

      await handleDirectorySyncEvent(buildGroupEvent("group.deleted"));

      expect(mockDb.group.delete).not.toHaveBeenCalled();

      const log = findIdpSyncLogData();
      expect(log.groupId).toBeNull();
      expect(log.removed).toStrictEqual(0);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
    });
  });

  describe("group.user_added", () => {
    test("UserGroupMembershipをupsertし、group.lastSyncedAtを更新する", async () => {
      await handleDirectorySyncEvent(
        buildUserWithGroupEvent("group.user_added"),
      );

      expect(mockDb.userGroupMembership.upsert).toHaveBeenCalledWith({
        where: {
          userId_groupId: { userId: "user-001", groupId: "group-001" },
        },
        create: {
          userId: "user-001",
          groupId: "group-001",
          source: GroupSource.IDP,
        },
        update: {},
      });

      // group.updateMany を呼ぶ（updateではなく updateMany でgroup削除済みでも冪等）
      expect(mockDb.group.updateMany).toHaveBeenCalledTimes(1);
      const updateArgs = getFirstCallArg(mockDb.group.updateMany);
      expect(updateArgs.where).toStrictEqual({ id: "group-001" });
      expect(updateArgs.data.lastSyncedAt).toBeInstanceOf(Date);

      const log = findIdpSyncLogData();
      expect(log.groupId).toStrictEqual("group-001");
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
      expect(log.added).toStrictEqual(1);
      expect(log.removed).toStrictEqual(0);
    });
  });

  describe("group.user_removed", () => {
    test("UserGroupMembershipをdeleteManyで削除し、removedにcountを記録する", async () => {
      await handleDirectorySyncEvent(
        buildUserWithGroupEvent("group.user_removed"),
      );

      expect(mockDb.userGroupMembership.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-001", groupId: "group-001" },
      });
      expect(mockDb.group.updateMany).toHaveBeenCalledTimes(1);

      const log = findIdpSyncLogData();
      expect(log.groupId).toStrictEqual("group-001");
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
      expect(log.added).toStrictEqual(0);
      expect(log.removed).toStrictEqual(1);
    });

    test("存在しないメンバーシップでもcount=0でエラーにならない（冪等）", async () => {
      mockDb.userGroupMembership.deleteMany.mockResolvedValue({ count: 0 });

      await handleDirectorySyncEvent(
        buildUserWithGroupEvent("group.user_removed"),
      );

      const log = findIdpSyncLogData();
      expect(log.removed).toStrictEqual(0);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
    });
  });

  describe("型ガードの早期 return", () => {
    test("user.created で data が email を持たない場合は何もしない", async () => {
      // 故意に Group 形状の data を渡す（型上の整合は外部 IdP 依存のため as でキャスト）
      const event = {
        ...baseEnvelope,
        event: "user.created",
        data: { id: "x", name: "BadShape" },
      } as unknown as DirectorySyncEvent;

      await handleDirectorySyncEvent(event);

      expect(mockDb.user.upsert).not.toHaveBeenCalled();

      const log = findIdpSyncLogData();
      expect(log.added).toStrictEqual(0);
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
    });

    test("group.created で data が User 形状の場合は何もしない", async () => {
      const event = {
        ...baseEnvelope,
        event: "group.created",
        data: {
          id: "x",
          email: "u@example.com",
          first_name: "U",
          last_name: "U",
          active: true,
        },
      } as unknown as DirectorySyncEvent;

      await handleDirectorySyncEvent(event);

      expect(mockDb.group.upsert).not.toHaveBeenCalled();
    });

    test("group.user_added で group プロパティを欠く場合は何もしない", async () => {
      const event = {
        ...baseEnvelope,
        event: "group.user_added",
        data: {
          id: "user-001",
          email: "u@example.com",
          first_name: "U",
          last_name: "U",
          active: true,
        },
      } as unknown as DirectorySyncEvent;

      await handleDirectorySyncEvent(event);

      expect(mockDb.userGroupMembership.upsert).not.toHaveBeenCalled();
    });

    // 各 case の isUser / isGroup / isUserWithGroup 早期 return を網羅し
    // ブランチカバレッジを 100% にする
    test.each([["user.updated"], ["user.deleted"]] as const)(
      "%s で email を欠く data の場合は何もしない",
      async (type) => {
        const event = {
          ...baseEnvelope,
          event: type,
          data: { id: "x", name: "BadShape" },
        } as unknown as DirectorySyncEvent;

        await handleDirectorySyncEvent(event);

        expect(mockDb.user.upsert).not.toHaveBeenCalled();
        expect(mockDb.user.updateMany).not.toHaveBeenCalled();
      },
    );

    test.each([["group.updated"], ["group.deleted"]] as const)(
      "%s で User 形状の data の場合は何もしない",
      async (type) => {
        const event = {
          ...baseEnvelope,
          event: type,
          data: {
            id: "x",
            email: "u@example.com",
            first_name: "U",
            last_name: "U",
            active: true,
          },
        } as unknown as DirectorySyncEvent;

        await handleDirectorySyncEvent(event);

        expect(mockDb.group.upsert).not.toHaveBeenCalled();
        expect(mockDb.group.findUnique).not.toHaveBeenCalled();
      },
    );

    test("group.user_removed で group プロパティを欠く場合は何もしない", async () => {
      const event = {
        ...baseEnvelope,
        event: "group.user_removed",
        data: {
          id: "user-001",
          email: "u@example.com",
          first_name: "U",
          last_name: "U",
          active: true,
        },
      } as unknown as DirectorySyncEvent;

      await handleDirectorySyncEvent(event);

      expect(mockDb.userGroupMembership.deleteMany).not.toHaveBeenCalled();
    });
  });

  // tooling/vitest/src/setup.ts で global.console.error は vi.fn() に差し替え済み、
  // beforeEach の vi.clearAllMocks() で呼び出し履歴もクリアされるため、
  // 個別テスト側で spyOn / mockRestore する必要はない
  describe("エラーハンドリング", () => {
    test("DB操作失敗時はthrowせずIdpSyncLogにstatus=FAILED, errors=1を記録する", async () => {
      mockDb.user.upsert.mockRejectedValue(new Error("connection refused"));

      await expect(
        handleDirectorySyncEvent(buildUserEvent("user.created")),
      ).resolves.toBeUndefined();

      const log = findIdpSyncLogData();
      expect(log.status).toStrictEqual(SyncStatus.FAILED);
      expect(log.errors).toStrictEqual(1);
      expect(log.added).toStrictEqual(0);
      expect(log.detail).toStrictEqual("connection refused");
      expect(console.error).toHaveBeenCalledWith(
        "[scim:event-handler]",
        "user.created",
        "connection refused",
      );
    });

    test("非Errorをthrowした場合はString化してdetailに記録する", async () => {
      mockDb.user.upsert.mockRejectedValue("plain string error");

      await handleDirectorySyncEvent(buildUserEvent("user.created"));

      const log = findIdpSyncLogData();
      expect(log.detail).toStrictEqual("plain string error");
      expect(log.status).toStrictEqual(SyncStatus.FAILED);
    });

    test("idpSyncLog.create失敗時はthrowせずconsole.errorのみ（IdP側の再試行ループを防ぐ）", async () => {
      mockDb.idpSyncLog.create.mockRejectedValue(new Error("log write failed"));

      await expect(
        handleDirectorySyncEvent(buildUserEvent("user.created")),
      ).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        "[scim:event-handler] idpSyncLog write failed:",
        expect.any(Error),
      );
    });
  });

  describe("不明イベント（exhaustive check）", () => {
    test("実装が知らないイベントタイプは何もせずSUCCESSログのみ残す", async () => {
      // 型上は never に到達するが、ランタイムでは IdP の将来追加に備えて throw しない設計
      const event = {
        ...baseEnvelope,
        event: "unknown.event",
        data: {
          id: "user-001",
          email: "u@example.com",
          first_name: "U",
          last_name: "U",
          active: true,
        },
      } as unknown as DirectorySyncEvent;

      await handleDirectorySyncEvent(event);

      expect(mockDb.user.upsert).not.toHaveBeenCalled();
      expect(mockDb.group.upsert).not.toHaveBeenCalled();

      const log = findIdpSyncLogData();
      expect(log.status).toStrictEqual(SyncStatus.SUCCESS);
      expect(log.added).toStrictEqual(0);
      expect(log.removed).toStrictEqual(0);
    });
  });
});
