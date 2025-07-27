import { Role } from "@prisma/client";
import { beforeEach, describe, expect, test } from "bun:test";

import {
  AdminUserFactory,
  OnboardedUserFactory,
  UserFactory,
} from "../testing/factories/user.js";
import { prismaMock, resetPrismaMock } from "../testing/prisma-mock.js";

describe("User creation with prisma-fabbrica", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  test("ユーザーを作成できる", async () => {
    const mockUser = await UserFactory.create({
      id: "test-id",
      email: "test@example.com",
      name: "Test User",
    });

    prismaMock.user.create.mockResolvedValue(mockUser);

    const result = await prismaMock.user.create({
      data: mockUser,
    });

    expect(result.id).toStrictEqual("test-id");
    expect(result.email).toStrictEqual("test@example.com");
    expect(result.name).toStrictEqual("Test User");
    expect(result.image).toStrictEqual(null);
    expect(result.role).toStrictEqual(Role.USER);
    expect(result.hasCompletedOnboarding).toStrictEqual(false);
  });

  test("ユーザーの検索ができる", async () => {
    const mockUser = await UserFactory.create({
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.jpg",
      hasCompletedOnboarding: true,
    });

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const result = await prismaMock.user.findUnique({
      where: { email: "test@example.com" },
    });

    expect(result).not.toBeNull();
    expect(result?.email).toStrictEqual("test@example.com");
    expect(result?.name).toStrictEqual("Test User");
    expect(result?.role).toStrictEqual(Role.USER);
  });

  test("存在しないユーザーの検索はnullを返す", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await prismaMock.user.findUnique({
      where: { email: "notfound@example.com" },
    });

    expect(result).toStrictEqual(null);
  });

  test("SYSTEM_ADMIN権限のユーザーを作成できる", async () => {
    const mockAdminUser = await AdminUserFactory.create({
      email: "admin@example.com",
      name: "Admin User",
    });

    prismaMock.user.create.mockResolvedValue(mockAdminUser);

    const result = await prismaMock.user.create({
      data: mockAdminUser,
    });

    expect(result.role).toStrictEqual(Role.SYSTEM_ADMIN);
    expect(result.hasCompletedOnboarding).toStrictEqual(true);
  });

  test("複数のユーザーを一度に作成できる", async () => {
    const mockUsers = await UserFactory.buildList(5);

    expect(mockUsers.length).toStrictEqual(5);

    // Check that all users have been created with sequential IDs
    const emails = mockUsers.map((user) => user.email);
    const names = mockUsers.map((user) => user.name);

    // Verify all emails follow the pattern
    emails.forEach((email) => {
      expect(email).toMatch(/^test-user-\d+@example\.com$/);
    });

    // Verify all names follow the pattern
    names.forEach((name) => {
      expect(name).toMatch(/^Test User \d+$/);
    });
  });

  test("オンボード済みユーザーを作成できる", async () => {
    const mockUser = await OnboardedUserFactory.build({
      name: "Onboarded User",
    });

    expect(mockUser.image).toStrictEqual("https://example.com/avatar.jpg");
    expect(mockUser.hasCompletedOnboarding).toStrictEqual(true);
  });
});
