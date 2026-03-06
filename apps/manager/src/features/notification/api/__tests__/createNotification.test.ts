import { describe, test, expect, beforeEach } from "vitest";
import { PrismaClient } from "@tumiki/db/prisma";
import type { PrismaTransactionClient } from "@tumiki/db";
import {
  createManyNotifications,
  type CreateManyNotificationsInput,
} from "../createNotification";

const prisma = new PrismaClient();

// TODO: CI環境ではテストDBが利用できないためスキップ
describe.skip("createManyNotifications", () => {
  let organizationId: string;
  let userIds: string[];

  beforeEach(async () => {
    const timestamp = Date.now();

    // テスト用のユーザーを作成（組織の作成者）
    const creator = await prisma.user.create({
      data: {
        id: `creator-${timestamp}`,
        email: `creator-${timestamp}@example.com`,
        name: "Creator",
      },
    });

    // テスト用の組織を作成
    const organization = await prisma.organization.create({
      data: {
        id: `org-${timestamp}`,
        name: "Test Organization",
        slug: `test-org-${timestamp}`,
        creator: {
          connect: { id: creator.id },
        },
      },
    });
    organizationId = organization.id;

    // テスト用のユーザーを3人作成
    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: `user-${timestamp}-1`,
          email: `user1-${timestamp}@example.com`,
          name: "User 1",
        },
      }),
      prisma.user.create({
        data: {
          id: `user-${timestamp}-2`,
          email: `user2-${timestamp}@example.com`,
          name: "User 2",
        },
      }),
      prisma.user.create({
        data: {
          id: `user-${timestamp}-3`,
          email: `user3-${timestamp}@example.com`,
          name: "User 3",
        },
      }),
    ]);

    userIds = users.map((user) => user.id);

    // 組織メンバーを作成
    await Promise.all(
      userIds.map((userId) =>
        prisma.organizationMember.create({
          data: {
            organizationId,
            userId,
          },
        }),
      ),
    );
  });

  test("複数のユーザーに同じ通知を一括作成できる", async () => {
    const input: CreateManyNotificationsInput = {
      type: "ORGANIZATION_INVITATION_SENT",
      priority: "NORMAL",
      title: "新しいメンバーが招待されました",
      message: "test@example.comが組織に招待されました。",
      linkUrl: "/test-org/members",
      organizationId,
      triggeredById: userIds[0],
    };

    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await createManyNotifications(tx, userIds, input);
    });

    // 通知が3件作成されていることを確認
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId,
      },
    });

    expect(notifications).toHaveLength(3);

    // 各通知の内容を確認
    notifications.forEach((notification) => {
      expect(notification.type).toBe(input.type);
      expect(notification.priority).toBe(input.priority);
      expect(notification.title).toBe(input.title);
      expect(notification.message).toBe(input.message);
      expect(notification.linkUrl).toBe(input.linkUrl);
      expect(notification.organizationId).toBe(organizationId);
      expect(notification.triggeredById).toBe(userIds[0]);
      expect(userIds).toContain(notification.userId);
    });
  });

  test("userIdsが空の場合は何も作成しない", async () => {
    const input: CreateManyNotificationsInput = {
      type: "ORGANIZATION_INVITATION_SENT",
      priority: "NORMAL",
      title: "新しいメンバーが招待されました",
      message: "test@example.comが組織に招待されました。",
      linkUrl: "/test-org/members",
      organizationId,
    };

    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await createManyNotifications(tx, [], input);
    });

    // 通知が作成されていないことを確認
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId,
      },
    });

    expect(notifications).toHaveLength(0);
  });

  test("priorityを指定しない場合はNORMALがデフォルトになる", async () => {
    const input: CreateManyNotificationsInput = {
      type: "ORGANIZATION_INVITATION_SENT",
      title: "新しいメンバーが招待されました",
      message: "test@example.comが組織に招待されました。",
      linkUrl: "/test-org/members",
      organizationId,
    };

    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await createManyNotifications(tx, [userIds[0]!], input);
    });

    const notification = await prisma.notification.findFirst({
      where: {
        organizationId,
        userId: userIds[0],
      },
    });

    expect(notification?.priority).toBe("NORMAL");
  });

  test("expiresAtを指定しない場合はデフォルト30日後になる", async () => {
    const beforeCreate = new Date();
    const input: CreateManyNotificationsInput = {
      type: "ORGANIZATION_INVITATION_SENT",
      title: "新しいメンバーが招待されました",
      message: "test@example.comが組織に招待されました。",
      linkUrl: "/test-org/members",
      organizationId,
    };

    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await createManyNotifications(tx, [userIds[0]!], input);
    });

    const notification = await prisma.notification.findFirst({
      where: {
        organizationId,
        userId: userIds[0],
      },
    });

    const expectedExpiresAt = new Date(
      beforeCreate.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    expect(notification?.expiresAt).toBeDefined();
    expect(notification?.expiresAt?.getTime()).toBeGreaterThanOrEqual(
      expectedExpiresAt.getTime() - 1000,
    ); // 1秒の誤差を許容
    expect(notification?.expiresAt?.getTime()).toBeLessThanOrEqual(
      expectedExpiresAt.getTime() + 1000,
    );
  });

  test("expiresAtを指定した場合はその値が使用される", async () => {
    const customExpiresAt = new Date("2025-12-31");
    const input: CreateManyNotificationsInput = {
      type: "ORGANIZATION_INVITATION_SENT",
      title: "新しいメンバーが招待されました",
      message: "test@example.comが組織に招待されました。",
      linkUrl: "/test-org/members",
      organizationId,
      expiresAt: customExpiresAt,
    };

    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await createManyNotifications(tx, [userIds[0]!], input);
    });

    const notification = await prisma.notification.findFirst({
      where: {
        organizationId,
        userId: userIds[0],
      },
    });

    expect(notification?.expiresAt?.getTime()).toBe(customExpiresAt.getTime());
  });
});
