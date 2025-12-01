// @vitest-environment vprisma

import { describe, test, expect, afterAll } from "vitest";
import { createOrganization } from "./createOrganization";
import { db } from "@tumiki/db/server";
import { TRPCError } from "@trpc/server";

describe("createOrganization", () => {
  const testUserId = "test-user-id";
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    // テストで作成した組織を削除
    if (createdOrgIds.length > 0) {
      await db.organization.deleteMany({
        where: {
          id: {
            in: createdOrgIds,
          },
        },
      });
    }
  });

  test("新しい組織を作成できる", async () => {
    const result = await db.$transaction(async (tx) => {
      return await createOrganization(tx, {
        userId: testUserId,
        name: "テスト組織",
        description: "テスト用の組織です",
      });
    });

    createdOrgIds.push(result.id);

    expect(result).toMatchObject({
      name: "テスト組織",
      description: "テスト用の組織です",
      logoUrl: null,
      isDeleted: false,
      isPersonal: false,
      maxMembers: 10,
      createdBy: testUserId,
    });
    expect(result.id).toBeTruthy();
    expect(result.slug).toBeTruthy();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  test("descriptionがnullの場合でも組織を作成できる", async () => {
    const result = await db.$transaction(async (tx) => {
      return await createOrganization(tx, {
        userId: testUserId,
        name: "説明なし組織",
        description: null,
      });
    });

    createdOrgIds.push(result.id);

    expect(result).toMatchObject({
      name: "説明なし組織",
      description: null,
      logoUrl: null,
      isDeleted: false,
      isPersonal: false,
      maxMembers: 10,
      createdBy: testUserId,
    });
  });

  test("descriptionがundefinedの場合でも組織を作成できる", async () => {
    const result = await db.$transaction(async (tx) => {
      return await createOrganization(tx, {
        userId: testUserId,
        name: "説明未定義組織",
        description: undefined,
      });
    });

    createdOrgIds.push(result.id);

    expect(result).toMatchObject({
      name: "説明未定義組織",
      description: null,
      logoUrl: null,
      isDeleted: false,
      isPersonal: false,
      maxMembers: 10,
      createdBy: testUserId,
    });
  });

  test("同じ名前の組織が既に存在する場合はエラーを投げる", async () => {
    const orgName = "重複テスト組織";

    // 最初の組織を作成
    const firstOrg = await db.$transaction(async (tx) => {
      return await createOrganization(tx, {
        userId: testUserId,
        name: orgName,
        description: "最初の組織",
      });
    });

    createdOrgIds.push(firstOrg.id);

    // 同じ名前で2つ目の組織を作成しようとするとエラー
    await expect(async () => {
      await db.$transaction(async (tx) => {
        return await createOrganization(tx, {
          userId: testUserId,
          name: orgName,
          description: "2つ目の組織",
        });
      });
    }).rejects.toThrow(TRPCError);
  });

  test("作成した組織のメンバーシップが自動的に作成される", async () => {
    const result = await db.$transaction(async (tx) => {
      return await createOrganization(tx, {
        userId: testUserId,
        name: "メンバーシップテスト組織",
        description: "メンバーシップの自動作成をテスト",
      });
    });

    createdOrgIds.push(result.id);

    // メンバーシップが作成されているか確認
    const membership = await db.organizationMember.findFirst({
      where: {
        organizationId: result.id,
        userId: testUserId,
      },
    });

    expect(membership).toBeTruthy();
    expect(membership?.isAdmin).toBe(true);
  });

  test("ユーザーのdefaultOrganizationSlugが更新される", async () => {
    const result = await db.$transaction(async (tx) => {
      return await createOrganization(tx, {
        userId: testUserId,
        name: "デフォルト組織更新テスト",
        description: "defaultOrganizationSlugの更新をテスト",
      });
    });

    createdOrgIds.push(result.id);

    // ユーザーのdefaultOrganizationSlugが更新されているか確認
    const user = await db.user.findUnique({
      where: { id: testUserId },
      select: { defaultOrganizationSlug: true },
    });

    expect(user?.defaultOrganizationSlug).toBe(result.slug);
  });
});
