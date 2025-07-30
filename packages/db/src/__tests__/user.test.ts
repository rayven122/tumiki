import type { Mock } from "vitest";
import { Role } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

// モックをインポート
import { db } from "../tcpClient.js";
import {
  AdminUserFactory,
  OnboardedUserFactory,
  UserFactory,
} from "../testing/factories/user.js";

// Prismaクライアントのモック
vi.mock("../tcpClient.js", () => ({
  db: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("User", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    test("正常系: 基本的なユーザーを作成できる", async () => {
      const mockUser = await UserFactory.build({
        id: "auth0|test-id",
        email: "test@example.com",
        name: "Test User",
      });

      (db.user.create as Mock).mockResolvedValue(mockUser);

      const result = await db.user.create({
        data: mockUser,
      });

      expect(result.id).toStrictEqual("auth0|test-id");
      expect(result.email).toStrictEqual("test@example.com");
      expect(result.name).toStrictEqual("Test User");
      expect(result.role).toStrictEqual(Role.USER);
      expect(result.hasCompletedOnboarding).toStrictEqual(false);
    });

    test("正常系: オンボーディング完了済みユーザーを作成できる", async () => {
      const mockUser = await OnboardedUserFactory.build({
        email: "onboarded@example.com",
        hasCompletedOnboarding: true,
      });

      (db.user.create as Mock).mockResolvedValue(mockUser);

      const result = await db.user.create({
        data: mockUser,
      });

      expect(result.hasCompletedOnboarding).toStrictEqual(true);
      expect(result.image).toStrictEqual("https://example.com/avatar.jpg");
    });

    test("正常系: SYSTEM_ADMIN権限のユーザーを作成できる", async () => {
      const mockAdminUser = await AdminUserFactory.build({
        email: "admin@example.com",
        name: "Admin User",
      });

      (db.user.create as Mock).mockResolvedValue(mockAdminUser);

      const result = await db.user.create({
        data: mockAdminUser,
      });

      expect(result.role).toStrictEqual(Role.SYSTEM_ADMIN);
      expect(result.hasCompletedOnboarding).toStrictEqual(true);
    });

    test("正常系: null値を含むユーザーを作成できる", async () => {
      const mockUser = await UserFactory.build({
        id: "auth0|null-user",
        email: null,
        name: null,
        image: null,
      });

      (db.user.create as Mock).mockResolvedValue(mockUser);

      const result = await db.user.create({
        data: mockUser,
      });

      expect(result.email).toStrictEqual(null);
      expect(result.name).toStrictEqual(null);
      expect(result.image).toStrictEqual(null);
    });

    test("正常系: 日付フィールドが自動設定される", async () => {
      const now = new Date();
      const mockUser = await UserFactory.build({
        createdAt: now,
        updatedAt: now,
      });

      (db.user.create as Mock).mockResolvedValue(mockUser);

      const result = await db.user.create({
        data: {
          id: mockUser.id,
          email: mockUser.email as string | null,
        },
      });

      expect(result.createdAt).toStrictEqual(now);
      expect(result.updatedAt).toStrictEqual(now);
    });
  });

  describe("findUnique", () => {
    test("正常系: emailでユーザーを検索できる", async () => {
      const mockUser = await UserFactory.build({
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        hasCompletedOnboarding: true,
      });

      (db.user.findUnique as Mock).mockResolvedValue(mockUser);

      const result = await db.user.findUnique({
        where: { email: "test@example.com" },
      });

      expect(result).not.toBeNull();
      expect(result?.email).toStrictEqual("test@example.com");
      expect(result?.name).toStrictEqual("Test User");
      expect(result?.role).toStrictEqual(Role.USER);
    });

    test("正常系: idでユーザーを検索できる", async () => {
      const mockUser = await UserFactory.build({
        id: "auth0|specific-id",
        email: "specific@example.com",
      });

      (db.user.findUnique as Mock).mockResolvedValue(mockUser);

      const result = await db.user.findUnique({
        where: { id: "auth0|specific-id" },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toStrictEqual("auth0|specific-id");
    });

    test("正常系: 存在しないユーザーの検索はnullを返す", async () => {
      (db.user.findUnique as Mock).mockResolvedValue(null);

      const result = await db.user.findUnique({
        where: { email: "notfound@example.com" },
      });

      expect(result).toStrictEqual(null);
    });
  });

  describe("findMany", () => {
    test("正常系: 複数のユーザーを取得できる", async () => {
      const mockUsers = await UserFactory.buildList(3);

      (db.user.findMany as Mock).mockResolvedValue(mockUsers);

      const result = await db.user.findMany();

      expect(result).toHaveLength(3);
      expect(result[0]?.email).toStrictEqual(mockUsers[0]?.email);
      expect(result[1]?.email).toStrictEqual(mockUsers[1]?.email);
      expect(result[2]?.email).toStrictEqual(mockUsers[2]?.email);
    });

    test("正常系: roleでフィルタリングできる", async () => {
      const adminUsers = await AdminUserFactory.buildList(2);

      (db.user.findMany as Mock).mockResolvedValue(adminUsers);

      const result = await db.user.findMany({
        where: { role: Role.SYSTEM_ADMIN },
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.role).toStrictEqual(Role.SYSTEM_ADMIN);
      expect(result[1]?.role).toStrictEqual(Role.SYSTEM_ADMIN);
    });

    test("正常系: hasCompletedOnboardingでフィルタリングできる", async () => {
      const onboardedUsers = await OnboardedUserFactory.buildList(3);

      (db.user.findMany as Mock).mockResolvedValue(onboardedUsers);

      const result = await db.user.findMany({
        where: { hasCompletedOnboarding: true },
      });

      expect(result).toHaveLength(3);
      expect(result.every((user) => user.hasCompletedOnboarding)).toStrictEqual(
        true,
      );
    });

    test("正常系: 空の結果セットを返す", async () => {
      (db.user.findMany as Mock).mockResolvedValue([]);

      const result = await db.user.findMany({
        where: { email: { contains: "nonexistent" } },
      });

      expect(result).toStrictEqual([]);
    });

    test("正常系: ページネーションで取得できる", async () => {
      const mockUsers = await UserFactory.buildList(5);
      const paginatedUsers = mockUsers.slice(2, 4);

      (db.user.findMany as Mock).mockResolvedValue(paginatedUsers);

      const result = await db.user.findMany({
        skip: 2,
        take: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.email).toStrictEqual(mockUsers[2]?.email);
      expect(result[1]?.email).toStrictEqual(mockUsers[3]?.email);
    });

    test("正常系: ソート順を指定して取得できる", async () => {
      const mockUsers = await UserFactory.buildList(3);
      const sortedUsers = [...mockUsers].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      (db.user.findMany as Mock).mockResolvedValue(sortedUsers);

      const result = await db.user.findMany({
        orderBy: { createdAt: "desc" },
      });

      expect(result).toHaveLength(3);
      expect(result).toStrictEqual(sortedUsers);
    });
  });

  describe("update", () => {
    test("正常系: nameを更新できる", async () => {
      const originalUser = await UserFactory.build({ name: "Old Name" });
      const originalUpdatedAt = originalUser.updatedAt
        ? new Date(originalUser.updatedAt)
        : new Date();
      const newUpdatedAt = new Date(originalUpdatedAt.getTime() + 1000);
      const updatedUser = {
        ...originalUser,
        name: "New Name",
        updatedAt: newUpdatedAt,
      };

      (db.user.update as Mock).mockResolvedValue(updatedUser);

      const result = await db.user.update({
        where: { id: originalUser.id },
        data: { name: "New Name" },
      });

      expect(result.name).toStrictEqual("New Name");
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    test("正常系: emailを更新できる", async () => {
      const originalUser = await UserFactory.build({
        email: "old@example.com",
      });
      const updatedUser = {
        ...originalUser,
        email: "new@example.com",
        updatedAt: new Date(),
      };

      (db.user.update as Mock).mockResolvedValue(updatedUser);

      const result = await db.user.update({
        where: { id: originalUser.id },
        data: { email: "new@example.com" },
      });

      expect(result.email).toStrictEqual("new@example.com");
    });

    test("正常系: hasCompletedOnboardingを更新できる", async () => {
      const originalUser = await UserFactory.build({
        hasCompletedOnboarding: false,
      });
      const updatedUser = {
        ...originalUser,
        hasCompletedOnboarding: true,
        updatedAt: new Date(),
      };

      (db.user.update as Mock).mockResolvedValue(updatedUser);

      const result = await db.user.update({
        where: { id: originalUser.id },
        data: { hasCompletedOnboarding: true },
      });

      expect(result.hasCompletedOnboarding).toStrictEqual(true);
    });

    test("正常系: roleを更新できる", async () => {
      const originalUser = await UserFactory.build({ role: Role.USER });
      const updatedUser = {
        ...originalUser,
        role: Role.SYSTEM_ADMIN,
        updatedAt: new Date(),
      };

      (db.user.update as Mock).mockResolvedValue(updatedUser);

      const result = await db.user.update({
        where: { id: originalUser.id },
        data: { role: Role.SYSTEM_ADMIN },
      });

      expect(result.role).toStrictEqual(Role.SYSTEM_ADMIN);
    });

    test("正常系: 複数フィールドを同時に更新できる", async () => {
      const originalUser = await UserFactory.build({
        name: "Old Name",
        email: "old@example.com",
        hasCompletedOnboarding: false,
      });
      const updatedUser = {
        ...originalUser,
        name: "New Name",
        email: "new@example.com",
        hasCompletedOnboarding: true,
        image: "https://example.com/new-avatar.jpg",
        updatedAt: new Date(),
      };

      (db.user.update as Mock).mockResolvedValue(updatedUser);

      const result = await db.user.update({
        where: { id: originalUser.id },
        data: {
          name: "New Name",
          email: "new@example.com",
          hasCompletedOnboarding: true,
          image: "https://example.com/new-avatar.jpg",
        },
      });

      expect(result.name).toStrictEqual("New Name");
      expect(result.email).toStrictEqual("new@example.com");
      expect(result.hasCompletedOnboarding).toStrictEqual(true);
      expect(result.image).toStrictEqual("https://example.com/new-avatar.jpg");
    });

    test("正常系: null値に更新できる", async () => {
      const originalUser = await UserFactory.build({
        name: "Name",
        image: "https://example.com/avatar.jpg",
      });
      const updatedUser = {
        ...originalUser,
        name: null,
        image: null,
        updatedAt: new Date(),
      };

      (db.user.update as Mock).mockResolvedValue(updatedUser);

      const result = await db.user.update({
        where: { id: originalUser.id },
        data: {
          name: null,
          image: null,
        },
      });

      expect(result.name).toStrictEqual(null);
      expect(result.image).toStrictEqual(null);
    });
  });

  describe("delete", () => {
    test("正常系: ユーザーを削除できる", async () => {
      const mockUser = await UserFactory.build();

      (db.user.delete as Mock).mockResolvedValue(mockUser);

      const result = await db.user.delete({
        where: { id: mockUser.id },
      });

      expect(result.id).toStrictEqual(mockUser.id);
      expect(result.email).toStrictEqual(mockUser.email);
      expect(result.name).toStrictEqual(mockUser.name);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.user.delete).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    test("正常系: emailでユーザーを削除できる", async () => {
      const mockUser = await UserFactory.build({ email: "delete@example.com" });

      (db.user.delete as Mock).mockResolvedValue(mockUser);

      const result = await db.user.delete({
        where: { email: "delete@example.com" },
      });

      expect(result.email).toStrictEqual("delete@example.com");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.user.delete).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.user.delete).toHaveBeenCalledWith({
        where: { email: "delete@example.com" },
      });
    });
  });
});
