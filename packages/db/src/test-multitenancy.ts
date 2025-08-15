// 自動フィルタリング機能の検証用スクリプト
import { runWithoutRLS, runWithTenant } from "./context/tenantContext.js";
import { db } from "./server.js";
import {
  McpServerFactory,
  OrganizationFactory,
  UserFactory,
  UserMcpServerConfigFactory,
} from "./testing/factories/index.js";

const testAutoFiltering = async () => {
  console.log("=== マルチテナンシー自動フィルタリング検証 ===\n");

  // テスト用データを作成
  const user = await UserFactory.create({
    id: "test-user-" + Date.now(),
    email: `test-${Date.now()}@example.com`,
  });

  const org1 = await OrganizationFactory.create({
    id: "test-org1-" + Date.now(),
    name: "テスト組織1",
    creator: {
      connect: { id: user.id },
    },
  });

  const org2 = await OrganizationFactory.create({
    id: "test-org2-" + Date.now(),
    name: "テスト組織2",
    creator: {
      connect: { id: user.id },
    },
  });

  const mcpServer = await McpServerFactory.create({
    id: "test-mcp-" + Date.now(),
    name: "テストMCPサーバー",
  });

  // 各組織にデータを作成
  await UserMcpServerConfigFactory.create({
    id: "config1-" + Date.now(),
    name: "組織1の設定",
    organization: {
      connect: { id: org1.id },
    },
    mcpServer: {
      connect: { id: mcpServer.id },
    },
  });

  await UserMcpServerConfigFactory.create({
    id: "config2-" + Date.now(),
    name: "組織2の設定",
    organization: {
      connect: { id: org2.id },
    },
    mcpServer: {
      connect: { id: mcpServer.id },
    },
  });

  // テスト1: 自動フィルタリング（whereなし）
  console.log("テスト1: 自動フィルタリング（whereなし）");
  const autoFiltered = await runWithTenant(
    { organizationId: org1.id },
    async () => {
      // whereを指定しない - 自動フィルタリングが効いていれば組織1のデータのみ返る
      return db.userMcpServerConfig.findMany();
    },
  );
  console.log(`  取得件数: ${autoFiltered.length}`);
  console.log(`  期待値: 1件（組織1のデータのみ）`);
  console.log(
    `  実際の組織ID: ${autoFiltered.map((c) => c.organizationId).join(", ")}`,
  );
  console.log(
    `  結果: ${autoFiltered.length === 1 && autoFiltered[0]?.organizationId === org1.id ? "✅ 成功" : "❌ 失敗"}\n`,
  );

  // テスト2: 手動フィルタリング（where指定）
  console.log("テスト2: 手動フィルタリング（where指定）");
  const manualFiltered = await runWithTenant(
    { organizationId: org1.id },
    async () => {
      // whereを明示的に指定
      return db.userMcpServerConfig.findMany({
        where: { organizationId: org1.id },
      });
    },
  );
  console.log(`  取得件数: ${manualFiltered.length}`);
  console.log(`  期待値: 1件（組織1のデータのみ）`);
  console.log(
    `  結果: ${manualFiltered.length === 1 ? "✅ 成功" : "❌ 失敗"}\n`,
  );

  // テスト3: RLSバイパス
  console.log("テスト3: RLSバイパス");
  const allData = await runWithoutRLS(async () => {
    return db.userMcpServerConfig.findMany({
      where: {
        id: {
          in: [autoFiltered[0]?.id || "", `config2-${Date.now()}`],
        },
      },
    });
  });
  console.log(`  取得件数: ${allData.length}`);
  console.log(`  期待値: 1件以上（RLSバイパスで全データアクセス可能）`);
  console.log(`  結果: ${allData.length >= 1 ? "✅ 成功" : "❌ 失敗"}\n`);

  // クリーンアップ
  await runWithoutRLS(async () => {
    await db.userMcpServerConfig.deleteMany({
      where: { id: { startsWith: "config" } },
    });
    await db.organization.deleteMany({
      where: { id: { startsWith: "test-org" } },
    });
    await db.user.deleteMany({
      where: { id: { startsWith: "test-user" } },
    });
    await db.mcpServer.deleteMany({
      where: { id: { startsWith: "test-mcp" } },
    });
  });

  console.log("=== 検証完了 ===");
};

// 実行
testAutoFiltering()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("エラー:", error);
    process.exit(1);
  });
