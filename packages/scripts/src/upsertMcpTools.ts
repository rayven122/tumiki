import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { db } from "@tumiki/db/server";
import { getMcpServerTools } from "@tumiki/utils/server";

import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * MCP サーバーからツールを取得してデータベースに書き込む
 * @param validServerNames 有効なサーバー名のリスト（環境変数が設定されているサーバー）
 */
export const upsertMcpTools = async (validServerNames?: string[]) => {
  const mcpServers = await db.mcpServer.findMany();
  let filteredMcpServers = mcpServers.filter((mcpServer) =>
    MCP_SERVERS.some((server) => server.name === mcpServer.name),
  );

  // 有効なサーバー名が指定されている場合、さらにフィルタリング
  if (validServerNames) {
    filteredMcpServers = filteredMcpServers.filter((mcpServer) =>
      validServerNames.includes(mcpServer.name),
    );
  }

  const skippedServers: string[] = [];
  const processedServers: string[] = [];

  for (const mcpServer of filteredMcpServers) {
    // 環境変数を取得
    const envVars = mcpServer.envVars.reduce<Record<string, string>>(
      (acc, envVar) => {
        acc[envVar] = process.env[envVar] ?? "";
        return acc;
      },
      {},
    );
    try {
      // ツール一覧を取得
      const tools: Tool[] = await getMcpServerTools(mcpServer, envVars);

      if (tools.length === 0) {
        console.log(`⚠️  ${mcpServer.name}: ツールが見つかりませんでした`);
        skippedServers.push(mcpServer.name);
        continue;
      }

      const upsertPromises = tools.map((tool: Tool) => {
        return db.tool.upsert({
          where: {
            mcpServerId_name: {
              mcpServerId: mcpServer.id,
              name: tool.name,
            },
          },
          update: {
            description: tool.description,
            inputSchema: tool.inputSchema as object,
          },
          create: {
            mcpServerId: mcpServer.id,
            name: tool.name,
            description: tool.description ?? "",
            inputSchema: tool.inputSchema as object,
          },
        });
      });

      // データベースにツールを書き込む
      const upsertedTools = await db.$transaction(upsertPromises);

      console.log(
        `✅ ${mcpServer.name}: ${upsertedTools.length}個のツールを登録`,
      );
      processedServers.push(mcpServer.name);
    } catch (error) {
      console.error(
        `❌ ${mcpServer.name}: ツール取得エラー`,
        error instanceof Error ? error.message : error,
      );
      skippedServers.push(mcpServer.name);
    }
  }

  // サマリーを表示
  console.log("");
  console.log("📊 ツール登録サマリー:");
  if (processedServers.length > 0) {
    console.log(`  ✅ 成功: ${processedServers.join(", ")}`);
  }
  if (skippedServers.length > 0) {
    console.log(`  ⚠️  スキップ: ${skippedServers.join(", ")}`);
  }
};
