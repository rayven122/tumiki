import { db } from "@tumiki/db/server";

/**
 * MCPサーバーとツールを一括で削除する
 */
const cleanUserMcp = async () => {
  try {
    // MCPサーバーの関連データを削除
    await db.mcpApiKey.deleteMany({});
    await db.mcpServerRequestLog.deleteMany({});
    await db.mcpServer.deleteMany({});
    await db.mcpConfig.deleteMany({});
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
  await cleanUserMcp();
} catch (error) {
  console.error(error);
} finally {
  await db.$disconnect();
  process.exit(0);
}
