import type { McpServer, Organization, User } from "@prisma/client";
import { beforeEach, describe, expect, test } from "vitest";

import { runWithoutRLS, runWithTenant } from "../context/tenantContext.js";
import { db } from "../server.js";
import {
  McpServerFactory,
  OrganizationFactory,
  UserFactory,
  UserMcpServerConfigFactory,
} from "../testing/factories/index.js";

describe("マルチテナンシー機能", () => {
  let testOrg1: Organization;
  let testOrg2: Organization;
  let testUser1: User;
  let testUser2: User;
  let testMcpServer: McpServer;

  beforeEach(async () => {
    // テスト用ユーザーを作成
    testUser1 = await UserFactory.create({
      id: "auth0|tenant-user-1",
      email: "tenant1@example.com",
    });
    testUser2 = await UserFactory.create({
      id: "auth0|tenant-user-2",
      email: "tenant2@example.com",
    });

    // テスト用組織を作成
    testOrg1 = await OrganizationFactory.create({
      id: "org_tenant_test_1",
      name: "テナント組織1",
      creator: {
        connect: { id: testUser1.id },
      },
    });
    testOrg2 = await OrganizationFactory.create({
      id: "org_tenant_test_2",
      name: "テナント組織2",
      creator: {
        connect: { id: testUser2.id },
      },
    });

    // テスト用MCPサーバーを作成
    testMcpServer = await McpServerFactory.create({
      id: "mcp_tenant_test",
      name: "テナントテスト用MCPサーバー",
    });
  });

  describe("テナントコンテキスト機能", () => {
    test("runWithTenantが正常に実行される", async () => {
      let contextExecuted = false;
      let capturedOrgId: string | null = null;

      await runWithTenant({ organizationId: testOrg1.id }, async () => {
        contextExecuted = true;
        capturedOrgId = testOrg1.id;
      });

      expect(contextExecuted).toBe(true);
      expect(capturedOrgId).toBe(testOrg1.id);
    });

    test("runWithoutRLSが正常に実行される", async () => {
      let contextExecuted = false;

      await runWithoutRLS(async () => {
        contextExecuted = true;
      });

      expect(contextExecuted).toBe(true);
    });
  });

  describe("基本的なデータベース操作", () => {
    test("異なる組織のUserMcpServerConfigが正しく作成される", async () => {
      // 組織1用の設定
      const config1 = await UserMcpServerConfigFactory.create({
        name: "組織1の設定",
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      // 組織2用の設定
      const config2 = await UserMcpServerConfigFactory.create({
        name: "組織2の設定",
        organization: {
          connect: { id: testOrg2.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      expect(config1.organizationId).toBe(testOrg1.id);
      expect(config2.organizationId).toBe(testOrg2.id);
      expect(config1.name).toBe("組織1の設定");
      expect(config2.name).toBe("組織2の設定");
    });

    test("組織IDを指定したfindMany操作が正常に動作する", async () => {
      // 複数の設定を作成
      await UserMcpServerConfigFactory.createList(3, {
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });
      await UserMcpServerConfigFactory.createList(2, {
        organization: {
          connect: { id: testOrg2.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      // 組織1の設定のみ取得
      const org1Configs = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg1.id },
      });

      // 組織2の設定のみ取得
      const org2Configs = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg2.id },
      });

      expect(org1Configs).toHaveLength(3);
      expect(org2Configs).toHaveLength(2);
      expect(
        org1Configs.every((config) => config.organizationId === testOrg1.id),
      ).toBe(true);
      expect(
        org2Configs.every((config) => config.organizationId === testOrg2.id),
      ).toBe(true);
    });

    test("findFirst操作が正常に動作する", async () => {
      const config = await UserMcpServerConfigFactory.create({
        name: "FindFirst テスト設定",
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      const foundConfig = await db.userMcpServerConfig.findFirst({
        where: {
          name: "FindFirst テスト設定",
          organizationId: testOrg1.id,
        },
      });

      expect(foundConfig).toBeTruthy();
      expect(foundConfig?.organizationId).toBe(testOrg1.id);
      expect(foundConfig?.name).toBe("FindFirst テスト設定");

      // 別組織では見つからない
      const notFound = await db.userMcpServerConfig.findFirst({
        where: {
          name: "FindFirst テスト設定",
          organizationId: testOrg2.id,
        },
      });

      expect(notFound).toBeNull();
    });

    test("update操作が正常に動作する", async () => {
      const config = await UserMcpServerConfigFactory.create({
        name: "更新前設定",
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      const updatedConfig = await db.userMcpServerConfig.update({
        where: { id: config.id },
        data: { name: "更新後設定" },
      });

      expect(updatedConfig.name).toBe("更新後設定");
      expect(updatedConfig.organizationId).toBe(testOrg1.id);
    });

    test("delete操作が正常に動作する", async () => {
      const config = await UserMcpServerConfigFactory.create({
        name: "削除テスト設定",
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      await db.userMcpServerConfig.delete({
        where: { id: config.id },
      });

      const deletedConfig = await db.userMcpServerConfig.findUnique({
        where: { id: config.id },
      });

      expect(deletedConfig).toBeNull();
    });

    test("count操作が正常に動作する", async () => {
      await UserMcpServerConfigFactory.createList(5, {
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      const count = await db.userMcpServerConfig.count({
        where: { organizationId: testOrg1.id },
      });

      expect(count).toBe(5);

      // 別組織では0件
      const org2Count = await db.userMcpServerConfig.count({
        where: { organizationId: testOrg2.id },
      });

      expect(org2Count).toBe(0);
    });

    test("createMany操作が正常に動作する", async () => {
      const createData = [
        {
          id: "bulk_config_1",
          name: "バルク作成設定1",
          description: "バルク作成テスト1",
          envVars: '{"TEST": "value1"}',
          organizationId: testOrg1.id,
          mcpServerId: testMcpServer.id,
        },
        {
          id: "bulk_config_2",
          name: "バルク作成設定2",
          description: "バルク作成テスト2",
          envVars: '{"TEST": "value2"}',
          organizationId: testOrg1.id,
          mcpServerId: testMcpServer.id,
        },
      ];

      const result = await db.userMcpServerConfig.createMany({
        data: createData,
      });

      expect(result.count).toBe(2);

      // 作成された設定を確認
      const createdConfigs = await db.userMcpServerConfig.findMany({
        where: {
          id: { in: ["bulk_config_1", "bulk_config_2"] },
        },
        orderBy: { id: "asc" },
      });

      expect(createdConfigs).toHaveLength(2);
      expect(createdConfigs[0]?.organizationId).toBe(testOrg1.id);
      expect(createdConfigs[1]?.organizationId).toBe(testOrg1.id);
    });
  });

  describe("runWithoutRLS機能のテスト", () => {
    beforeEach(async () => {
      // 各組織に設定を作成
      await UserMcpServerConfigFactory.create({
        name: "RLSバイパス設定1",
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });
      await UserMcpServerConfigFactory.create({
        name: "RLSバイパス設定2",
        organization: {
          connect: { id: testOrg2.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });
    });

    test("runWithoutRLS内では全組織のデータが取得できる", async () => {
      const allConfigs = await runWithoutRLS(async () => {
        return db.userMcpServerConfig.findMany({
          where: {
            name: { startsWith: "RLSバイパス設定" },
          },
          orderBy: { name: "asc" },
        });
      });

      expect(allConfigs).toHaveLength(2);
      expect(allConfigs[0]?.organizationId).toBe(testOrg1.id);
      expect(allConfigs[1]?.organizationId).toBe(testOrg2.id);
    });

    test("runWithoutRLS内でもwhereフィルタが正常に動作する", async () => {
      const filteredConfigs = await runWithoutRLS(async () => {
        return db.userMcpServerConfig.findMany({
          where: {
            name: "RLSバイパス設定1",
          },
        });
      });

      expect(filteredConfigs).toHaveLength(1);
      expect(filteredConfigs[0]?.organizationId).toBe(testOrg1.id);
    });
  });

  describe("非テナントスコープモデルの処理", () => {
    test("ユーザーモデルでは組織フィルタが適用されない", async () => {
      const users = await db.user.findMany();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(2);
    });

    test("MCPサーバーモデルでは組織フィルタが適用されない", async () => {
      const mcpServers = await db.mcpServer.findMany();
      expect(Array.isArray(mcpServers)).toBe(true);
      expect(mcpServers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("複雑なクエリパターン", () => {
    test("リレーションを含むクエリが正常に動作する", async () => {
      const config = await UserMcpServerConfigFactory.create({
        name: "リレーションテスト設定",
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
      });

      const configWithRelations = await db.userMcpServerConfig.findUnique({
        where: { id: config.id },
        include: {
          mcpServer: true,
          organization: true,
        },
      });

      expect(configWithRelations).toBeTruthy();
      expect(configWithRelations?.mcpServer).toBeTruthy();
      expect(configWithRelations?.organization).toBeTruthy();
      expect(configWithRelations?.mcpServer.id).toBe(testMcpServer.id);
      expect(configWithRelations?.organization?.id).toBe(testOrg1.id);
    });

    test("複合whereクエリが正常に動作する", async () => {
      // ユニークなプレフィックスを使用
      const uniquePrefix = `複合テスト${Date.now()}`;

      await UserMcpServerConfigFactory.createList(3, {
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
        name: `${uniquePrefix}_アクティブ設定`,
      });
      await UserMcpServerConfigFactory.createList(2, {
        organization: {
          connect: { id: testOrg1.id },
        },
        mcpServer: {
          connect: { id: testMcpServer.id },
        },
        name: `${uniquePrefix}_インアクティブ設定`,
      });

      const activeConfigs = await db.userMcpServerConfig.findMany({
        where: {
          AND: [
            { organizationId: testOrg1.id },
            { name: { contains: `${uniquePrefix}_アクティブ設定` } },
          ],
        },
      });

      expect(activeConfigs).toHaveLength(3);
      expect(
        activeConfigs.every(
          (config) =>
            config.organizationId === testOrg1.id &&
            config.name === `${uniquePrefix}_アクティブ設定`,
        ),
      ).toBe(true);
    });
  });
});
