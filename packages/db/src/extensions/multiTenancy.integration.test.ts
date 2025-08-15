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

describe("マルチテナンシー基本機能テスト", () => {
  let testOrg1: Organization;
  let testOrg2: Organization;
  let testUser1: User; // 組織1の作成者・メンバー
  let testUser2: User; // 組織2の作成者・メンバー
  let testMcpServer: McpServer;

  beforeEach(async () => {
    // 組織1用ユーザーを作成
    testUser1 = await UserFactory.create({
      id: `auth0|integration-user1-${Date.now()}`,
      email: `integration-user1-${Date.now()}@example.com`,
    });

    // 組織2用ユーザーを作成
    testUser2 = await UserFactory.create({
      id: `auth0|integration-user2-${Date.now()}`,
      email: `integration-user2-${Date.now()}@example.com`,
    });

    // テスト用組織を作成（異なるユーザーが作成者）
    testOrg1 = await OrganizationFactory.create({
      id: `org_integration_1_${Date.now()}`,
      name: "統合テスト組織1",
      creator: {
        connect: { id: testUser1.id },
      },
    });

    testOrg2 = await OrganizationFactory.create({
      id: `org_integration_2_${Date.now()}`,
      name: "統合テスト組織2",
      creator: {
        connect: { id: testUser2.id },
      },
    });

    // テスト用MCPサーバーを作成
    testMcpServer = await McpServerFactory.create({
      id: `mcp_integration_${Date.now()}`,
      name: "統合テスト用MCPサーバー",
    });
  });

  describe("テスト1: 基本的な組織分離", () => {
    test("組織ごとにデータが正しく分離されて取得される", async () => {
      // 各組織にデータを作成
      const config1 = await UserMcpServerConfigFactory.create({
        id: `config_integration_1_${Date.now()}`,
        name: "組織1の設定",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      const config2 = await UserMcpServerConfigFactory.create({
        id: `config_integration_2_${Date.now()}`,
        name: "組織2の設定",
        organization: { connect: { id: testOrg2.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      // 組織1のデータのみ取得
      const org1Results = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg1.id },
      });

      // 期待値: 組織1のデータのみ取得される
      expect(org1Results).toHaveLength(1);
      expect(org1Results[0]?.id).toBe(config1.id);
      expect(org1Results[0]?.organizationId).toBe(testOrg1.id);

      // 組織2のデータのみ取得
      const org2Results = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg2.id },
      });

      // 期待値: 組織2のデータのみ取得される
      expect(org2Results).toHaveLength(1);
      expect(org2Results[0]?.id).toBe(config2.id);
      expect(org2Results[0]?.organizationId).toBe(testOrg2.id);
    });

    test("組織間でのデータ分離が正しく機能する", async () => {
      // 各組織にデータを作成
      await UserMcpServerConfigFactory.create({
        id: `config_isolation_1_${Date.now()}`,
        name: "組織1の設定",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      await UserMcpServerConfigFactory.create({
        id: `config_isolation_2_${Date.now()}`,
        name: "組織2の設定",
        organization: { connect: { id: testOrg2.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      // 組織1のデータは組織2のクエリでは取得されない
      const org2OnlyResults = await db.userMcpServerConfig.findMany({
        where: { organizationId: testOrg2.id },
      });

      expect(org2OnlyResults).toHaveLength(1);
      expect(org2OnlyResults[0]?.name).toBe("組織2の設定");
    });
  });

  describe("テスト2: テナントコンテキスト機能", () => {
    test("runWithTenantコンテキストが正常に設定される", async () => {
      let capturedContext: ReturnType<typeof getTenantContext>;

      await runWithTenant({ organizationId: testOrg1.id }, async () => {
        capturedContext = getTenantContext();
      });

      expect(capturedContext!).toBeTruthy();
      expect(capturedContext!.organizationId).toBe(testOrg1.id);
    });

    test("runWithoutRLSが正常に動作する", async () => {
      // データを作成
      await UserMcpServerConfigFactory.create({
        name: "RLS テスト設定1",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      await UserMcpServerConfigFactory.create({
        name: "RLS テスト設定2",
        organization: { connect: { id: testOrg2.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      // RLSバイパスで全データ取得
      const allConfigs = await runWithoutRLS(async () => {
        return db.userMcpServerConfig.findMany({
          where: {
            name: { startsWith: "RLS テスト設定" },
          },
        });
      });

      // 期待値: 両組織のデータが取得される
      expect(allConfigs).toHaveLength(2);
      const orgIds = allConfigs.map((c) => c.organizationId);
      expect(orgIds).toContain(testOrg1.id);
      expect(orgIds).toContain(testOrg2.id);
    });
  });

  describe("テスト3: 基本的なCRUD操作", () => {
    test("組織IDを指定したfindFirst操作", async () => {
      await UserMcpServerConfigFactory.create({
        name: "FindFirst テスト設定",
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
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

    test("count操作が正常に動作する", async () => {
      await UserMcpServerConfigFactory.createList(3, {
        organization: { connect: { id: testOrg1.id } },
        mcpServer: { connect: { id: testMcpServer.id } },
      });

      const count = await db.userMcpServerConfig.count({
        where: { organizationId: testOrg1.id },
      });

      expect(count).toBe(3);

      // 別組織では0件
      const org2Count = await db.userMcpServerConfig.count({
        where: { organizationId: testOrg2.id },
      });

      expect(org2Count).toBe(0);
    });
  });
});
