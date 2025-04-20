import { upsertMcpServers } from "./upsertMcpServers";
import { upsertMcpTools } from "./upsertMcpTools";
import { db } from "@/server/db";

/**
 * MCPサーバーとツールを一括で登録する
 */
const upsertAll = async () => {
  try {
    // MCPサーバーを登録
    await upsertMcpServers();
    console.log("MCPサーバーが正常に登録されました");

    // MCPツールを登録
    await upsertMcpTools();
    console.log("MCPツールが正常に登録されました");
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
