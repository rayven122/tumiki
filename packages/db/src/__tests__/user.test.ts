import { Role } from "@prisma/client";
import { beforeEach, describe, expect, test } from "vitest";

import {
  AdminUserFactory,
  OnboardedUserFactory,
  UserFactory,
} from "../testing/factories/user.js";

const prisma = vPrisma.client;

describe("UserFactory", () => {
  describe("基本的なユーザー作成", () => {
    test("デフォルト値でユーザーを作成できる", async () => {
      const user = await UserFactory.create();

      expect(user.id).toMatch(/^auth0\|test-user-/);
      expect(user.email).toMatch(/^test-user-.*@example\.com$/);
      expect(user.name).toMatch(/^Test User/);
      expect(user.image).toBeNull();
      expect(user.role).toStrictEqual(Role.USER);
    });

    test("カスタム値でユーザーを作成できる", async () => {
      const customData = {
        email: "custom@example.com",
        name: "Custom User",
        image: "https://example.com/custom.jpg",
      };

      const user = await UserFactory.create(customData);

      expect(user.email).toStrictEqual(customData.email);
      expect(user.name).toStrictEqual(customData.name);
      expect(user.image).toStrictEqual(customData.image);
    });

    test("複数のユーザーを作成できる", async () => {
      const users = await UserFactory.createList(3);

      expect(users).toHaveLength(3);
      expect(new Set(users.map((u) => u.id))).toHaveLength(3);
      expect(new Set(users.map((u) => u.email))).toHaveLength(3);
    });
  });

  describe("AdminUserFactory", () => {
    test("管理者権限のユーザーを作成できる", async () => {
      const admin = await AdminUserFactory.create();

      expect(admin.id).toMatch(/^auth0\|admin-user-/);
      expect(admin.email).toMatch(/^admin-user-.*@example\.com$/);
      expect(admin.name).toMatch(/^Admin User/);
      expect(admin.role).toStrictEqual(Role.SYSTEM_ADMIN);
    });
  });

  describe("OnboardedUserFactory", () => {
    test("オンボーディング完了済みユーザーを作成できる", async () => {
      const user = await OnboardedUserFactory.create();

      expect(user.id).toMatch(/^auth0\|onboarded-user-/);
      expect(user.email).toMatch(/^onboarded-user-.*@example\.com$/);
      expect(user.name).toMatch(/^Onboarded User/);
      expect(user.image).toStrictEqual("https://example.com/avatar.jpg");
      expect(user.role).toStrictEqual(Role.USER);
    });
  });

  describe("データベーストランザクション", () => {
    test("各テストは独立したトランザクション内で実行される", async () => {
      const user1 = await UserFactory.create({ email: "test1@example.com" });

      const foundUser = await prisma.user.findUnique({
        where: { id: user1.id },
      });

      expect(foundUser).toBeTruthy();
      expect(foundUser?.email).toStrictEqual("test1@example.com");
    });

    test("前のテストのデータは見えない", async () => {
      const users = await prisma.user.findMany({
        where: { email: "test1@example.com" },
      });

      expect(users).toHaveLength(0);
    });
  });

  describe("Prismaクエリの実行", () => {
    beforeEach(async () => {
      await UserFactory.create({ email: "setup@example.com" });
    });

    test("findManyクエリが実行できる", async () => {
      await UserFactory.createList(3);

      const users = await prisma.user.findMany();

      expect(users.length).toBeGreaterThanOrEqual(4);
    });

    test("updateクエリが実行できる", async () => {
      const user = await UserFactory.create();

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: "Updated Name" },
      });

      expect(updatedUser.name).toStrictEqual("Updated Name");
    });

    test("deleteクエリが実行できる", async () => {
      const user = await UserFactory.create();

      await prisma.user.delete({
        where: { id: user.id },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });

    test("countクエリが実行できる", async () => {
      await UserFactory.createList(5);

      const count = await prisma.user.count();

      expect(count).toBeGreaterThanOrEqual(6);
    });
  });
});
