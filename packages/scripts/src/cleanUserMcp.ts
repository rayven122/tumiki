import { db } from "@tumiki/db";

/**
 * MCPサーバーとツールを一括で登録する
 */
const cleanUserMcp = async () => {
  try {
    // MCPサーバーを登録
    await db.userMcpServerInstance.deleteMany({});
    await db.userMcpServerConfig.deleteMany({});
    await db.userToolGroup.deleteMany({});
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
