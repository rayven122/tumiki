/**
 * 統合MCPエンドポイントE2Eテスト用データシード
 *
 * テスト用のデータベースに統合MCPサーバーと子サーバーをセットアップ
 */

import {
  AuthType,
  ServerStatus,
  ServerType,
  TransportType,
  PiiMaskingMode,
} from "@prisma/client";
import { db } from "@tumiki/db/server";

// テスト用の定数
export const TEST_API_KEY = "test-unified-mcp-api-key-e2e";
export const TEST_USER_ID = "unified-mcp-e2e-test-user";
export const TEST_ORG_ID = "org_unified_mcp_e2e_test";
export const TEST_UNIFIED_MCP_SERVER_ID = "unified_mcp_server_e2e";
export const TEST_MCP_SERVER_A_ID = "mcp_server_a_e2e";
export const TEST_MCP_SERVER_B_ID = "mcp_server_b_e2e";
export const TEST_TEMPLATE_A_ID = "mcp_template_a_e2e";
export const TEST_TEMPLATE_B_ID = "mcp_template_b_e2e";

/**
 * シードデータの作成結果
 */
export type SeedResult = {
  userId: string;
  organizationId: string;
  unifiedMcpServerId: string;
  mcpServerAId: string;
  mcpServerBId: string;
  apiKey: string;
};

/**
 * E2Eテスト用のシードデータを作成
 *
 * @param serverAUrl - モックサーバーAのURL
 * @param serverBUrl - モックサーバーBのURL
 * @returns シードデータの情報
 */
export const seedUnifiedMcpTestData = async (
  serverAUrl: string,
  serverBUrl: string,
): Promise<SeedResult> => {
  console.log("🚀 統合MCPエンドポイントE2Eテスト用データの投入を開始...\n");

  // 1. テストユーザーの作成
  console.log("👤 テストユーザーを作成中...");
  const user = await db.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: "unified-mcp-e2e-test@example.com",
      name: "Unified MCP E2E Test User",
      emailVerified: new Date(),
    },
  });
  console.log(`   ✓ ユーザーID: ${user.id}\n`);

  // 2. テスト組織の作成
  console.log("🏢 テスト組織を作成中...");
  const organization = await db.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: {
      id: TEST_ORG_ID,
      name: "Unified MCP E2E Test Organization",
      slug: "unified-mcp-e2e-test-org",
      description: "統合MCPエンドポイントE2Eテスト用の組織",
      isPersonal: true,
      maxMembers: 1,
      createdBy: user.id,
    },
  });
  console.log(`   ✓ 組織ID: ${organization.id}\n`);

  // 3. McpServerTemplate A (echo, add ツール) の作成
  console.log("📦 McpServerTemplate Aを作成中...");
  const templateA = await db.mcpServerTemplate.upsert({
    where: { id: TEST_TEMPLATE_A_ID },
    update: { url: serverAUrl },
    create: {
      id: TEST_TEMPLATE_A_ID,
      name: "Test Server A",
      normalizedName: "test_server_a",
      description: "E2Eテスト用サーバーA (echo, addツール)",
      tags: ["test", "e2e"],
      iconPath: null,
      transportType: TransportType.STREAMABLE_HTTPS,
      command: null,
      args: [],
      url: serverAUrl,
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      organization: {
        connect: { id: organization.id },
      },
    },
  });
  console.log(`   ✓ テンプレートA ID: ${templateA.id}`);
  console.log(`   ✓ URL: ${templateA.url}\n`);

  // 4. McpServerTemplate B (multiply ツール) の作成
  console.log("📦 McpServerTemplate Bを作成中...");
  const templateB = await db.mcpServerTemplate.upsert({
    where: { id: TEST_TEMPLATE_B_ID },
    update: { url: serverBUrl },
    create: {
      id: TEST_TEMPLATE_B_ID,
      name: "Test Server B",
      normalizedName: "test_server_b",
      description: "E2Eテスト用サーバーB (multiplyツール)",
      tags: ["test", "e2e"],
      iconPath: null,
      transportType: TransportType.STREAMABLE_HTTPS,
      command: null,
      args: [],
      url: serverBUrl,
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      organization: {
        connect: { id: organization.id },
      },
    },
  });
  console.log(`   ✓ テンプレートB ID: ${templateB.id}`);
  console.log(`   ✓ URL: ${templateB.url}\n`);

  // 5. McpTool の作成
  console.log("🔧 McpToolを作成中...");
  const toolsA = [
    {
      id: "tool_e2e_echo",
      name: "echo",
      description: "Echoes the input message",
      inputSchema: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
    },
    {
      id: "tool_e2e_add",
      name: "add",
      description: "Adds two numbers",
      inputSchema: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"],
      },
    },
  ];

  const toolsB = [
    {
      id: "tool_e2e_multiply",
      name: "multiply",
      description: "Multiplies two numbers",
      inputSchema: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"],
      },
    },
  ];

  for (const toolData of toolsA) {
    await db.mcpTool.upsert({
      where: { id: toolData.id },
      update: {},
      create: {
        ...toolData,
        mcpServerTemplateId: templateA.id,
      },
    });
    console.log(`   ✓ ツール (Server A): ${toolData.name}`);
  }

  for (const toolData of toolsB) {
    await db.mcpTool.upsert({
      where: { id: toolData.id },
      update: {},
      create: {
        ...toolData,
        mcpServerTemplateId: templateB.id,
      },
    });
    console.log(`   ✓ ツール (Server B): ${toolData.name}`);
  }
  console.log();

  // 6. McpServer A の作成
  console.log("🖥️  McpServer Aを作成中...");
  const mcpServerA = await db.mcpServer.upsert({
    where: { id: TEST_MCP_SERVER_A_ID },
    update: {},
    create: {
      id: TEST_MCP_SERVER_A_ID,
      name: "E2E Test Server A Instance",
      description: "E2Eテスト用サーバーAインスタンス",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: ServerType.CUSTOM,
      authType: AuthType.NONE,
      piiMaskingMode: PiiMaskingMode.DISABLED,
      piiInfoTypes: [],
      toonConversionEnabled: false,
      organizationId: organization.id,
      templateInstances: {
        create: [
          {
            mcpServerTemplateId: templateA.id,
            normalizedName: "instance_a",
            isEnabled: true,
            displayOrder: 0,
            allowedTools: {
              connect: toolsA.map((t) => ({ id: t.id })),
            },
          },
        ],
      },
    },
  });
  console.log(`   ✓ サーバーA ID: ${mcpServerA.id}\n`);

  // 7. McpServer B の作成
  console.log("🖥️  McpServer Bを作成中...");
  const mcpServerB = await db.mcpServer.upsert({
    where: { id: TEST_MCP_SERVER_B_ID },
    update: {},
    create: {
      id: TEST_MCP_SERVER_B_ID,
      name: "E2E Test Server B Instance",
      description: "E2Eテスト用サーバーBインスタンス",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: ServerType.CUSTOM,
      authType: AuthType.NONE,
      piiMaskingMode: PiiMaskingMode.DISABLED,
      piiInfoTypes: [],
      toonConversionEnabled: false,
      organizationId: organization.id,
      templateInstances: {
        create: [
          {
            mcpServerTemplateId: templateB.id,
            normalizedName: "instance_b",
            isEnabled: true,
            displayOrder: 0,
            allowedTools: {
              connect: toolsB.map((t) => ({ id: t.id })),
            },
          },
        ],
      },
    },
  });
  console.log(`   ✓ サーバーB ID: ${mcpServerB.id}\n`);

  // 8. UnifiedMcpServer の作成
  console.log("🔗 UnifiedMcpServerを作成中...");
  const unifiedMcpServer = await db.unifiedMcpServer.upsert({
    where: { id: TEST_UNIFIED_MCP_SERVER_ID },
    update: {},
    create: {
      id: TEST_UNIFIED_MCP_SERVER_ID,
      name: "E2E Test Unified MCP Server",
      description: "E2Eテスト用統合MCPサーバー",
      organizationId: organization.id,
      createdBy: user.id,
      childServers: {
        create: [
          { mcpServerId: mcpServerA.id, displayOrder: 0 },
          { mcpServerId: mcpServerB.id, displayOrder: 1 },
        ],
      },
    },
  });
  console.log(`   ✓ 統合サーバーID: ${unifiedMcpServer.id}\n`);

  // 9. McpApiKey の作成（通常のMCPサーバー用 - E2Eテスト用）
  // 注意: 統合MCPサーバーはOAuth（JWT）認証を使用するため、API Keyは通常サーバー用
  console.log("🔑 McpApiKeyを作成中（通常サーバーA用）...");
  const existingApiKey = await db.mcpApiKey.findFirst({
    where: {
      apiKey: TEST_API_KEY,
    },
  });

  const mcpApiKey =
    existingApiKey ??
    (await db.mcpApiKey.create({
      data: {
        name: "E2E Test API Key for Server A",
        apiKey: TEST_API_KEY,
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        scopes: [],
        userId: user.id,
        mcpServerId: mcpServerA.id,
      },
    }));
  console.log(`   ✓ APIキーID: ${mcpApiKey.id}\n`);

  console.log(
    "✅ 統合MCPエンドポイントE2Eテスト用データの投入が完了しました！\n",
  );

  return {
    userId: user.id,
    organizationId: organization.id,
    unifiedMcpServerId: unifiedMcpServer.id,
    mcpServerAId: mcpServerA.id,
    mcpServerBId: mcpServerB.id,
    apiKey: TEST_API_KEY,
  };
};

/**
 * E2Eテスト用データをクリーンアップ
 */
export const cleanupUnifiedMcpTestData = async (): Promise<void> => {
  console.log("🧹 統合MCPエンドポイントE2Eテスト用データのクリーンアップ中...");

  // 依存関係の順序で削除
  // API Keyを削除（通常サーバーに紐づけられている）
  await db.mcpApiKey.deleteMany({
    where: {
      mcpServerId: { in: [TEST_MCP_SERVER_A_ID, TEST_MCP_SERVER_B_ID] },
    },
  });

  await db.unifiedMcpServerChild.deleteMany({
    where: {
      unifiedMcpServerId: TEST_UNIFIED_MCP_SERVER_ID,
    },
  });

  await db.unifiedMcpServer.deleteMany({
    where: {
      id: TEST_UNIFIED_MCP_SERVER_ID,
    },
  });

  // テンプレートインスタンスを削除（McpConfigが参照している場合があるため先にMcpConfigを削除）
  const templateInstancesA = await db.mcpServerTemplateInstance.findMany({
    where: { mcpServerId: TEST_MCP_SERVER_A_ID },
  });
  const templateInstancesB = await db.mcpServerTemplateInstance.findMany({
    where: { mcpServerId: TEST_MCP_SERVER_B_ID },
  });
  const allTemplateInstanceIds = [
    ...templateInstancesA.map((t) => t.id),
    ...templateInstancesB.map((t) => t.id),
  ];

  if (allTemplateInstanceIds.length > 0) {
    await db.mcpConfig.deleteMany({
      where: {
        mcpServerTemplateInstanceId: { in: allTemplateInstanceIds },
      },
    });
  }

  await db.mcpServerTemplateInstance.deleteMany({
    where: {
      mcpServerId: { in: [TEST_MCP_SERVER_A_ID, TEST_MCP_SERVER_B_ID] },
    },
  });

  await db.mcpServer.deleteMany({
    where: {
      id: { in: [TEST_MCP_SERVER_A_ID, TEST_MCP_SERVER_B_ID] },
    },
  });

  await db.mcpTool.deleteMany({
    where: {
      mcpServerTemplateId: { in: [TEST_TEMPLATE_A_ID, TEST_TEMPLATE_B_ID] },
    },
  });

  await db.mcpServerTemplate.deleteMany({
    where: {
      id: { in: [TEST_TEMPLATE_A_ID, TEST_TEMPLATE_B_ID] },
    },
  });

  await db.organization.deleteMany({
    where: {
      id: TEST_ORG_ID,
    },
  });

  await db.user.deleteMany({
    where: {
      id: TEST_USER_ID,
    },
  });

  console.log("✅ クリーンアップが完了しました！\n");
};
