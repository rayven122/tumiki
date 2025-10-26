/**
 * @fileoverview Cloud Run MCP サーバー接続テストスクリプト
 *
 * 使い方:
 * 1. Cloud Run URL と API キーを環境変数に設定
 * 2. pnpm with-env npx tsx scripts/test-cloudrun-connection.ts
 */

import { createMCPClient } from "../src/utils/createMCPClient.js";
import type { ServerConfig } from "../src/libs/types.js";

const testCloudRunConnection = async () => {
  console.log("🚀 Cloud Run MCP サーバー接続テスト開始\n");

  // テスト対象のサーバー設定
  const servers: ServerConfig[] = [
    {
      name: "DeepL MCP (Cloud Run)",
      toolNames: [],
      transport: {
        type: "streamable_https",
        url: "https://deepl-mcp-67726874216.asia-northeast1.run.app",
        env: {
          "X-DeepL-API-Key": process.env.DEEPL_API_KEY ?? "",
        },
        requireCloudRunAuth: true,
      },
    },
    {
      name: "Figma MCP (Cloud Run)",
      toolNames: [],
      transport: {
        type: "streamable_https",
        url: "https://figma-mcp-67726874216.asia-northeast1.run.app",
        env: {
          "X-Figma-API-Key": process.env.FIGMA_API_KEY ?? "",
        },
        requireCloudRunAuth: true,
      },
    },
  ];

  for (const serverConfig of servers) {
    console.log(`\n📡 テスト: ${serverConfig.name}`);
    console.log(
      `   URL: ${serverConfig.transport.type === "streamable_https" ? serverConfig.transport.url : "N/A"}`,
    );

    try {
      // 1. MCP クライアント作成
      console.log("   ⏳ MCP クライアントを作成中...");
      const { client, transport, credentialsCleanup } =
        await createMCPClient(serverConfig);

      if (!client || !transport) {
        console.error("   ❌ クライアントまたはトランスポートの作成に失敗");
        continue;
      }

      console.log("   ✅ クライアント作成成功");

      // 2. サーバーに接続
      console.log("   ⏳ サーバーに接続中...");
      await client.connect(transport);
      console.log("   ✅ 接続成功");

      // 3. サーバー情報を取得
      console.log("   ⏳ サーバー情報を取得中...");
      const serverInfo = await client.getServerVersion();
      console.log("   ✅ サーバー情報:");
      console.log(`      - 名前: ${serverInfo?.name ?? "不明"}`);
      console.log(`      - バージョン: ${serverInfo?.version ?? "不明"}`);

      // 4. ツールリストを取得
      console.log("   ⏳ ツールリストを取得中...");
      const tools = await client.listTools();
      console.log(`   ✅ ツール数: ${tools.tools.length}`);

      if (tools.tools.length > 0) {
        console.log("   📋 利用可能なツール:");
        tools.tools.slice(0, 5).forEach((tool) => {
          console.log(`      - ${tool.name}: ${tool.description}`);
        });
        if (tools.tools.length > 5) {
          console.log(`      ... 他 ${tools.tools.length - 5} 個のツール`);
        }
      }

      // 5. クリーンアップ
      await client.close();
      if (credentialsCleanup) {
        await credentialsCleanup();
      }

      console.log(`   ✅ ${serverConfig.name} のテスト完了\n`);
    } catch (error) {
      console.error(
        `   ❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        console.error(`   スタックトレース:\n${error.stack}`);
      }
    }
  }

  console.log("\n✅ すべてのテスト完了");
};

// テスト実行
testCloudRunConnection().catch((error) => {
  console.error("❌ テスト実行エラー:", error);
  process.exit(1);
});
