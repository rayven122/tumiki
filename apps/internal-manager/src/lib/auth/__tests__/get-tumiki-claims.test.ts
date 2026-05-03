/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { GroupSource, SyncStatus, SyncTrigger } from "@tumiki/internal-db";
import { getTumikiClaims } from "../get-tumiki-claims";
import type { PrismaTransactionClient } from "@tumiki/internal-db";

// PrismaTransactionClient のモック
const buildDb = (overrides: Partial<typeof mockDb> = {}) =>
  ({ ...mockDb, ...overrides }) as unknown as PrismaTransactionClient;

const mockUser = { id: "user-sub-001", role: "USER" as const };

const fn = <TArgs extends unknown[] = [], TReturn = unknown>() =>
  vi.fn<(...args: TArgs) => TReturn>();

const mockDb = {
  user: {
    update: fn(),
  },
  externalIdentity: {
    upsert: fn(),
  },
  group: {
    findMany: fn(),
  },
  userGroupMembership: {
    findMany: fn(),
    createMany: fn(),
    deleteMany: fn(),
  },
  idpSyncLog: {
    create: fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.user.update.mockResolvedValue(mockUser);
  mockDb.externalIdentity.upsert.mockResolvedValue({});
  mockDb.group.findMany.mockResolvedValue([]);
  mockDb.userGroupMembership.findMany.mockResolvedValue([]);
  mockDb.userGroupMembership.createMany.mockResolvedValue({ count: 0 });
  mockDb.userGroupMembership.deleteMany.mockResolvedValue({ count: 0 });
  mockDb.idpSyncLog.create.mockResolvedValue({});
});

describe("getTumikiClaims", () => {
  describe("ユーザーが存在しない場合", () => {
    test("nullを返す", async () => {
      mockDb.user.update.mockRejectedValue(new Error("not found"));

      const result = await getTumikiClaims(
        buildDb(),
        "unknown-user",
        "oidc",
        "unknown-sub",
        [],
      );

      expect(result).toBeNull();
    });
  });

  describe("グループクレームが空の場合", () => {
    test("TumikiClaimsを返しSUCCESSログを記録する", async () => {
      const result = await getTumikiClaims(
        buildDb(),
        mockUser.id,
        "oidc",
        mockUser.id,
        [],
      );

      expect(result).toStrictEqual({
        org_slugs: [],
        org_id: null,
        org_slug: null,
        roles: [mockUser.role],
        group_roles: [],
      });

      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trigger: SyncTrigger.JIT,
          status: SyncStatus.SUCCESS,
          added: 0,
          removed: 0,
        }),
      });
    });

    test("IDPメンバーシップを追加しない", async () => {
      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, []);

      expect(mockDb.userGroupMembership.createMany).not.toHaveBeenCalled();
      expect(mockDb.userGroupMembership.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("グループクレームが未設定の場合", () => {
    test("IDPメンバーシップ同期をスキップして既存所属を削除しない", async () => {
      mockDb.userGroupMembership.findMany.mockResolvedValue([
        { id: "mem-1", groupId: "group-a" },
      ]);

      const result = await getTumikiClaims(
        buildDb(),
        mockUser.id,
        "oidc",
        mockUser.id,
        undefined,
      );

      expect(result).toStrictEqual({
        org_slugs: [],
        org_id: null,
        org_slug: null,
        roles: [mockUser.role],
        group_roles: undefined,
      });
      expect(mockDb.group.findMany).not.toHaveBeenCalled();
      expect(mockDb.userGroupMembership.findMany).not.toHaveBeenCalled();
      expect(mockDb.userGroupMembership.createMany).not.toHaveBeenCalled();
      expect(mockDb.userGroupMembership.deleteMany).not.toHaveBeenCalled();
      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trigger: SyncTrigger.JIT,
          status: SyncStatus.SUCCESS,
          added: 0,
          removed: 0,
          detail:
            "Skipped because the OIDC group_roles claim was not returned.",
        }),
      });
    });
  });

  describe("lastLoginAt・isActive更新", () => {
    test("User.updateにlastLoginAtとisActive:trueが渡される", async () => {
      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, []);

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          isActive: true,
          lastLoginAt: expect.any(Date),
        }),
        select: { id: true, role: true },
      });
    });
  });

  describe("ExternalIdentity upsert", () => {
    test("(provider, sub)でupsertが呼ばれる", async () => {
      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, []);

      expect(mockDb.externalIdentity.upsert).toHaveBeenCalledWith({
        where: { provider_sub: { provider: "oidc", sub: mockUser.id } },
        create: { userId: mockUser.id, provider: "oidc", sub: mockUser.id },
        update: {},
      });
    });
  });

  describe("グループ追加（新規メンバーシップ）", () => {
    test("DBに存在するIDPグループのメンバーシップが作成される", async () => {
      mockDb.group.findMany.mockResolvedValue([
        { id: "group-a" },
        { id: "group-b" },
      ]);
      mockDb.userGroupMembership.findMany.mockResolvedValue([]);

      const result = await getTumikiClaims(
        buildDb(),
        mockUser.id,
        "oidc",
        mockUser.id,
        ["/GroupA", "/GroupB"],
      );

      expect(mockDb.userGroupMembership.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { userId: mockUser.id, groupId: "group-a", source: GroupSource.IDP },
          { userId: mockUser.id, groupId: "group-b", source: GroupSource.IDP },
        ]),
        skipDuplicates: true,
      });

      expect(result?.group_roles).toStrictEqual(["/GroupA", "/GroupB"]);

      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: SyncStatus.SUCCESS,
          added: 2,
          removed: 0,
        }),
      });
    });

    test("DBに未登録のIDPグループは無視される", async () => {
      // IDPクレームに3グループあるがDBには1つだけ
      mockDb.group.findMany.mockResolvedValue([{ id: "group-a" }]);
      mockDb.userGroupMembership.findMany.mockResolvedValue([]);

      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, [
        "/GroupA",
        "/GroupUnregistered",
        "/GroupAlsoUnregistered",
      ]);

      expect(mockDb.userGroupMembership.createMany).toHaveBeenCalledWith({
        data: [
          { userId: mockUser.id, groupId: "group-a", source: GroupSource.IDP },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe("グループ削除（脱退したメンバーシップ）", () => {
    test("IDPクレームから外れたメンバーシップが削除される", async () => {
      // DBには group-a と group-b に所属、IDPクレームは group-a のみ
      mockDb.group.findMany.mockResolvedValue([{ id: "group-a" }]);
      mockDb.userGroupMembership.findMany.mockResolvedValue([
        { id: "mem-1", groupId: "group-a" },
        { id: "mem-2", groupId: "group-b" },
      ]);

      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, [
        "/GroupA",
      ]);

      expect(mockDb.userGroupMembership.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["mem-2"] } },
      });

      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: SyncStatus.SUCCESS,
          added: 0,
          removed: 1,
        }),
      });
    });

    test("全グループから脱退した場合は全メンバーシップが削除される", async () => {
      mockDb.group.findMany.mockResolvedValue([]);
      mockDb.userGroupMembership.findMany.mockResolvedValue([
        { id: "mem-1", groupId: "group-a" },
        { id: "mem-2", groupId: "group-b" },
      ]);

      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, []);

      expect(mockDb.userGroupMembership.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["mem-1", "mem-2"] } },
      });
    });
  });

  describe("差分更新（追加と削除が同時発生）", () => {
    test("追加と削除が同時に正しく処理される", async () => {
      // group-a: 継続, group-b: 脱退, group-c: 新規
      mockDb.group.findMany.mockResolvedValue([
        { id: "group-a" },
        { id: "group-c" },
      ]);
      mockDb.userGroupMembership.findMany.mockResolvedValue([
        { id: "mem-1", groupId: "group-a" },
        { id: "mem-2", groupId: "group-b" },
      ]);

      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, [
        "/GroupA",
        "/GroupC",
      ]);

      expect(mockDb.userGroupMembership.createMany).toHaveBeenCalledWith({
        data: [
          { userId: mockUser.id, groupId: "group-c", source: GroupSource.IDP },
        ],
        skipDuplicates: true,
      });

      expect(mockDb.userGroupMembership.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["mem-2"] } },
      });

      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: SyncStatus.SUCCESS,
          added: 1,
          removed: 1,
        }),
      });
    });
  });

  describe("同期エラーハンドリング", () => {
    test("グループ同期失敗時もnullを返さずFAILEDログを記録する", async () => {
      mockDb.group.findMany.mockRejectedValue(new Error("DB connection error"));

      const result = await getTumikiClaims(
        buildDb(),
        mockUser.id,
        "oidc",
        mockUser.id,
        ["/GroupA"],
      );

      // ログインは続行（nullではない）
      expect(result).not.toBeNull();
      expect(result?.group_roles).toStrictEqual(["/GroupA"]);

      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trigger: SyncTrigger.JIT,
          status: SyncStatus.FAILED,
          added: 0,
          removed: 0,
        }),
      });
    });
  });

  describe("既存メンバーシップと同一の場合", () => {
    test("変更なしでも正常にSUCCESSログが記録される", async () => {
      mockDb.group.findMany.mockResolvedValue([{ id: "group-a" }]);
      mockDb.userGroupMembership.findMany.mockResolvedValue([
        { id: "mem-1", groupId: "group-a" },
      ]);

      await getTumikiClaims(buildDb(), mockUser.id, "oidc", mockUser.id, [
        "/GroupA",
      ]);

      expect(mockDb.userGroupMembership.createMany).not.toHaveBeenCalled();
      expect(mockDb.userGroupMembership.deleteMany).not.toHaveBeenCalled();

      expect(mockDb.idpSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: SyncStatus.SUCCESS,
          added: 0,
          removed: 0,
        }),
      });
    });
  });
});
