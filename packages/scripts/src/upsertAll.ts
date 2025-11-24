import { db } from "@tumiki/db/server";

import { getValidMcpServers, validateEnv } from "./env";
import { upsertMcpServers } from "./upsertMcpServers";
import { upsertMcpTools } from "./upsertMcpTools";

/**
 * MCPサーバーとツールを一括で登録する
 */
const upsertAll = async () => {
  // 環境変数のバリデーション
  const env = validateEnv();

  // 有効なMCPサーバーを取得
  const validServers = getValidMcpServers(env);
  const validServerNames = validServers.map((server) => server.name);

  console.log("🔍 環境変数チェック結果:");
  console.log(
    `  有効なサーバー数: ${validServers.length}/${(await import("./constants/mcpServers.js")).MCP_SERVERS.length}`,
  );
  console.log("");

  try {
    // MCPサーバーテンプレートを登録（有効なサーバーのみ）
    await upsertMcpServers(validServerNames);
    console.log("");

    // MCPツールを登録（有効なサーバーのみ）
    await upsertMcpTools(validServerNames);
    console.log("");

    console.log("✨ 処理が完了しました");
  } catch (error) {
    if (error instanceof Error) {
      console.error("エラーが発生しました:", error.message);
    } else {
      console.error("エラーが発生しました:", error);
    }
    throw error;
  }
};

try {
  await upsertAll();
} catch (error) {
  console.error(error);
} finally {
  await db.$disconnect();
  process.exit(0);
}
