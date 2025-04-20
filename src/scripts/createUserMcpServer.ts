import { db } from "@/server/db";

/**
 * UserMcpServerを作成する
 */
export const createUserMcpServer = async () => {
  try {
    const mcpServer = await db.mcpServer.findFirst();
    if (!mcpServer) {
      throw new Error("MCPサーバーが見つかりません");
    }

    const user = await db.user.findFirst();
    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }

    const userMcpServer = await db.userMcpServer.create({
      data: {
        userId: user.id,
        mcpServerId: mcpServer.id, // MCPサーバーID
        name: "カスタムMCPサーバー", // カスタムMCPサーバー名
        envVars: JSON.stringify({
          accessToken: "1234567890",
        }),
      },
    });

    console.log("UserMcpServerが正常に作成されました:");
    console.log(JSON.stringify(userMcpServer, null, 2));

    const userMcpServers = await db.userMcpServer.findMany({
      where: {
        userId: user.id,
      },
    });

    console.log("UserMcpServer一覧:");
    console.log(JSON.stringify(userMcpServers, null, 2));

    return userMcpServer;
  } catch (error) {
    if (error instanceof Error) {
      console.error("エラーが発生しました:", error.message);
    } else {
      console.error("エラーが発生しました:", error);
    }
    throw error;
  }
};

// スクリプトを直接実行する場合の処理
if (require.main === module) {
  createUserMcpServer()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
