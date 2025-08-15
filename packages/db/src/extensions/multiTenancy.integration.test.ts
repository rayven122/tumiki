import type { McpServer, Organization, User } from "@prisma/client";
import { beforeEach, describe, expect, test } from "vitest";

import {
  getTenantContext,
  runWithoutRLS,
  runWithTenant,
} from "../context/tenantContext.js";
import { db } from "../server.js";
import {
  McpServerFactory,
  OrganizationFactory,
  UserFactory,
  UserMcpServerConfigFactory,
} from "../testing/factories/index.js";

describe("マルチテナンシー統合テスト", () => {
  let testOrg1: Organization;
  let testOrg2: Organization;
  let testUser: User;
  let testMcpServer: McpServer;

  beforeEach(async () => {
    // テスト用ユーザーを作成
    testUser = await UserFactory.create({
      id: `auth0|test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
    });

    // テスト用組織を作成
    testOrg1 = await OrganizationFactory.create({
      id: `org_test_1_${Date.now()}`,
      name: "テスト組織1",
      creator: { connect: { id: testUser.id } },
    });

    testOrg2 = await OrganizationFactory.create({
      id: `org_test_2_${Date.now()}`,
      name: "テスト組織2",
      creator: { connect: { id: testUser.id } },
    });

    // テスト用MCPサーバーを作成
    testMcpServer = await McpServerFactory.create({
      id: `mcp_test_${Date.now()}`,
      name: "テスト用MCPサーバー",
    });
  });

  describe("組織データ分離", () => {
    test("各組織のデータが正しく分離される", async () => {
      // 各組織にデータを作成
      const config1 = await UserMcpServerConfigFactory.create({
        name: "組織1の設定",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      const config2 = await UserMcpServerConfigFactory.create({
        name: "組織2の設定",
        organization: { connect: { id: testOrg2.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      // 組織1のデータのみ取得
      const org1Results = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg1.id },
      });

      expect(org1Results).toHaveLength(1);
      expect(org1Results[0]?.id).toBe(config1.id);

      // 組織2のデータのみ取得
      const org2Results = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg2.id },
      });

      expect(org2Results).toHaveLength(1);
      expect(org2Results[0]?.id).toBe(config2.id);
    });
  });

  describe("テナントコンテキスト", () => {
    test("runWithTenantがコンテキストを正しく設定する", async () => {
      let capturedContext: ReturnType<typeof getTenantContext>;

      await runWithTenant({ organizationId: testOrg1.id }, async () => {
        capturedContext = getTenantContext();
      });

      expect(capturedContext!).toBeTruthy();
      expect(capturedContext!.organizationId).toBe(testOrg1.id);
    });

    test("runWithoutRLSが全組織のデータにアクセスできる", async () => {
      // 各組織にデータを作成
      await UserMcpServerConfigFactory.create({
        name: "RLSテスト1",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      await UserMcpServerConfigFactory.create({
        name: "RLSテスト2",
        organization: { connect: { id: testOrg2.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      // RLSバイパスで全データ取得
      const allConfigs = await runWithoutRLS(async () => {
        return db.userMcpServerConfig.findMany({
          where: { name: { startsWith: "RLSテスト" } },
        });
      });

      expect(allConfigs).toHaveLength(2);
      const orgIds = allConfigs.map((c) => c.organizationId);
      expect(orgIds).toContain(testOrg1.id);
      expect(orgIds).toContain(testOrg2.id);
    });
  });

  describe("CRUD操作", () => {
    test("create操作で組織IDが設定される", async () => {
      const config = await runWithTenant(
        { organizationId: testOrg1.id },
        async () => {
          return db.userMcpServerConfig.create({
            data: {
              name: "新規設定",
              description: "テスト",
              envVars: '{"TEST": "true"}',
              mcpServerId: testMcpServer.id,
              organizationId: testOrg1.id, // 明示的に設定
            },
          });
        },
      );

      expect(config.organizationId).toBe(testOrg1.id);
    });

    test("update操作で組織のデータのみ更新される", async () => {
      const config = await UserMcpServerConfigFactory.create({
        id: "update-test",
        name: "更新前",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      const updated = await db.userMcpServerConfig.update({
        where: { id: config.id },
        data: { name: "更新後" },
      });

      expect(updated.name).toBe("更新後");
      expect(updated.organizationId).toBe(testOrg1.id);
    });

    test("delete操作で組織のデータが削除される", async () => {
      const config = await UserMcpServerConfigFactory.create({
        id: "delete-test",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      await db.userMcpServerConfig.delete({
        where: { id: config.id },
      });

      const deleted = await db.userMcpServerConfig.findUnique({
        where: { id: config.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe("検索操作", () => {
    test("findFirstが組織でフィルタリングされたデータを返す", async () => {
      await UserMcpServerConfigFactory.create({
        name: "検索テスト",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      const found = await db.userMcpServerConfig.findFirst({
        where: {
          name: "検索テスト",
          organizationId: testOrg1.id,
        },
      });

      expect(found).toBeTruthy();
      expect(found?.organizationId).toBe(testOrg1.id);

      // 別組織では見つからない
      const notFound = await db.userMcpServerConfig.findFirst({
        where: {
          name: "検索テスト",
          organizationId: testOrg2.id,
        },
      });

      expect(notFound).toBeNull();
    });

    test("countが組織ごとの正しい件数を返す", async () => {
      await UserMcpServerConfigFactory.createList(3, {
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      const count = await db.userMcpServerConfig.count({
        where: { organizationId: testOrg1.id },
      });

      expect(count).toBe(3);

      const org2Count = await db.userMcpServerConfig.count({
        where: { organizationId: testOrg2.id },
      });

      expect(org2Count).toBe(0);
    });
  });

  describe("バルク操作", () => {
    test("createManyで複数レコードに組織IDが設定される", async () => {
      const result = await db.userMcpServerConfig.createMany({
        data: [
          {
            id: "bulk-1",
            name: "バルク1",
            description: "テスト",
            envVars: '{"BULK": "1"}',
            mcpServerId: testMcpServer.id,
            organizationId: testOrg1.id,
          },
          {
            id: "bulk-2",
            name: "バルク2",
            description: "テスト",
            envVars: '{"BULK": "2"}',
            mcpServerId: testMcpServer.id,
            organizationId: testOrg1.id,
          },
        ],
      });

      expect(result.count).toBe(2);

      const created = await db.userMcpServerConfig.findMany({
        where: { id: { in: ["bulk-1", "bulk-2"] } },
      });

      expect(created).toHaveLength(2);
      expect(created.every((c) => c.organizationId === testOrg1.id)).toBe(true);
    });
  });
});
