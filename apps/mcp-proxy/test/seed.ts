#!/usr/bin/env tsx
/**
 * MCP Proxy検証用テストデータシードスクリプト
 *
 * このスクリプトは、mcp-proxyのAPI Key認証を検証するための
 * テストデータをデータベースに投入します。
 *
 * 実行方法:
 * 1. テスト用DBを起動: docker compose -f ./docker/compose.yaml up -d db-test
 * 2. スキーマ適用: cd packages/db && pnpm db:push:test
 * 3. シード実行: cd apps/mcp-proxy && pnpm seed:verification
 */

import {
  AuthType,
  ServerStatus,
  ServerType,
  TransportType,
} from "@prisma/client";
import { db } from "@tumiki/db/server";

const TEST_API_KEY = "test-api-key-12345-verification";
const TEST_USER_ID = "mcp-proxy-test-user";
const TEST_ORG_ID = "org_mcp_proxy_test";
const TEST_MCP_SERVER_ID = "mcp_server_verification";
const TEST_MCP_SERVER_TEMPLATE_ID = "mcp_template_context7";

const main = async () => {
  console.log("🚀 MCP Proxy検証用テストデータの投入を開始します...\n");

  // 1. テストユーザーの作成
  console.log("👤 テストユーザーを作成中...");
  const user = await db.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: "mcp-proxy-test@example.com",
      name: "MCP Proxy Test User",
      emailVerified: new Date(),
    },
  });
  console.log(`   ✓ ユーザーID: ${user.id}`);
  console.log(`   ✓ Email: ${user.email}\n`);

  // 2. テスト組織の作成
  console.log("🏢 テスト組織を作成中...");
  const organization = await db.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: {
      id: TEST_ORG_ID,
      name: "MCP Proxy Test Organization",
      slug: "mcp-proxy-test-org",
      description: "mcp-proxy検証用のテスト組織",
      isPersonal: true,
      maxMembers: 1,
      createdBy: user.id,
    },
  });
  console.log(`   ✓ 組織ID: ${organization.id}`);
  console.log(`   ✓ 組織名: ${organization.name}\n`);

  // 3. McpServerTemplate (Context7) の作成
  console.log("📦 McpServerTemplateを作成中...");
  const mcpServerTemplate = await db.mcpServerTemplate.upsert({
    where: { id: TEST_MCP_SERVER_TEMPLATE_ID },
    update: {},
    create: {
      id: TEST_MCP_SERVER_TEMPLATE_ID,
      name: "Context7",
      normalizedName: "context7",
      description: "Context7 MCP Server - Library documentation provider",
      tags: ["documentation", "library", "context7"],
      iconPath: "https://context7.com/icon.png",
      transportType: TransportType.STREAMABLE_HTTPS,
      command: null,
      args: [],
      url: "https://mcp.context7.com/mcp",
      envVarKeys: ["CONTEXT7_API_KEY"],
      authType: AuthType.API_KEY,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
    },
  });
  console.log(`   ✓ テンプレートID: ${mcpServerTemplate.id}`);
  console.log(`   ✓ テンプレート名: ${mcpServerTemplate.name}`);
  console.log(`   ✓ トランスポート: ${mcpServerTemplate.transportType}`);
  console.log(`   ✓ URL: ${mcpServerTemplate.url}\n`);

  // 4. McpConfig (環境変数設定) の作成
  console.log("⚙️  McpConfigを作成中...");
  // userId が null の場合、upsert の where 句で使用できないため、
  // 既存レコードを検索して、存在すれば何もせず、なければ作成する
  const existingConfig = await db.mcpConfig.findFirst({
    where: {
      mcpServerTemplateId: mcpServerTemplate.id,
      organizationId: organization.id,
      userId: null,
    },
  });

  const mcpConfig =
    existingConfig ??
    (await db.mcpConfig.create({
      data: {
        mcpServerTemplateId: mcpServerTemplate.id,
        organizationId: organization.id,
        userId: null, // 組織共通設定
        envVars: JSON.stringify({
          CONTEXT7_API_KEY: "dummy-context7-api-key-for-testing",
        }),
      },
    }));
  console.log(`   ✓ ConfigID: ${mcpConfig.id}`);
  console.log(`   ✓ 組織共通設定として作成\n`);

  // 5. McpTool の作成
  console.log("🔧 McpToolを作成中...");
  const tools = [
    {
      id: "tool_context7_resolve_library_id",
      name: "resolve-library-id",
      description:
        "Resolves a package/product name to a Context7-compatible library ID",
    },
    {
      id: "tool_context7_get_library_docs",
      name: "get-library-docs",
      description: "Fetches up-to-date documentation for a library",
    },
  ];

  for (const toolData of tools) {
    await db.mcpTool.upsert({
      where: { id: toolData.id },
      update: {},
      create: {
        id: toolData.id,
        name: toolData.name,
        description: toolData.description,
        inputSchema: {},
        mcpServerTemplateId: mcpServerTemplate.id,
      },
    });
    console.log(`   ✓ ツール: ${toolData.name}`);
  }
  console.log();

  // 6. McpServer (インスタンス) の作成
  console.log("🖥️  McpServerを作成中...");
  const mcpServer = await db.mcpServer.upsert({
    where: { id: TEST_MCP_SERVER_ID },
    update: {},
    create: {
      id: TEST_MCP_SERVER_ID,
      name: "Context7 Verification Server",
      description: "mcp-proxy検証用のContext7サーバーインスタンス",
      iconPath: mcpServerTemplate.iconPath,
      serverStatus: ServerStatus.RUNNING,
      serverType: ServerType.CUSTOM,
      authType: AuthType.API_KEY,
      organizationId: organization.id,
      mcpServers: {
        connect: [{ id: mcpServerTemplate.id }],
      },
      allowedTools: {
        connect: tools.map((t) => ({ id: t.id })),
      },
    },
  });
  console.log(`   ✓ サーバーID: ${mcpServer.id}`);
  console.log(`   ✓ サーバー名: ${mcpServer.name}`);
  console.log(`   ✓ ステータス: ${mcpServer.serverStatus}\n`);

  // 7. McpApiKey の作成
  console.log("🔑 McpApiKeyを作成中...");
  // prisma-field-encryptionがapiKeyHashを自動生成
  // upsertのwhere句では暗号化フィールドを使えないため、findFirst + createパターンを使用

  const existingApiKey = await db.mcpApiKey.findFirst({
    where: {
      apiKey: TEST_API_KEY,
    },
  });

  const mcpApiKey =
    existingApiKey ??
    (await db.mcpApiKey.create({
      data: {
        name: "Verification API Key",
        apiKey: TEST_API_KEY,
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        scopes: [],
        userId: user.id,
        mcpServerId: mcpServer.id,
      },
    }));
  console.log(`   ✓ APIキーID: ${mcpApiKey.id}`);
  console.log(`   ✓ APIキー名: ${mcpApiKey.name}`);
  console.log(`   ✓ 有効: ${mcpApiKey.isActive}\n`);

  // 完了メッセージ
  console.log("✅ テストデータの投入が完了しました！\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 検証に使用する情報:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`API Key:       ${TEST_API_KEY}`);
  console.log(`MCP Server ID: ${TEST_MCP_SERVER_ID}`);
  console.log(`User ID:       ${TEST_USER_ID}`);
  console.log(`Organization:  ${TEST_ORG_ID}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("次のステップ:");
  console.log("1. mcp-proxyを起動: pnpm dev");
  console.log("2. VERIFICATION.mdを参照して検証を実行");
  console.log();
};

void main()
  .catch((e) => {
    console.error("❌ エラーが発生しました:", e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
