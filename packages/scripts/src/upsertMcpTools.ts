import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { db } from "@tumiki/db/server";

import { MCP_ENV_MOCK_KEYS } from "./constants/mcpEnvMockKeys";
import { MCP_SERVERS } from "./constants/mcpServers";
import { getMcpServerTools } from "./utils/getMcpServerTools";

/**
 * MCP サーバーテンプレートからツールを取得してデータベースに書き込む
 * @param validServerNames 有効なサーバー名のリスト（環境変数が設定されているサーバー）
 */
export const upsertMcpTools = async (validServerNames?: string[]) => {
  const mcpServerTemplates = await db.mcpServerTemplate.findMany();
  let filteredMcpServerTemplates = mcpServerTemplates.filter(
    (mcpServerTemplate) =>
      MCP_SERVERS.some((server) => server.name === mcpServerTemplate.name),
  );

  // 有効なサーバー名が指定されている場合、さらにフィルタリング
  if (validServerNames) {
    filteredMcpServerTemplates = filteredMcpServerTemplates.filter(
      (mcpServerTemplate) => validServerNames.includes(mcpServerTemplate.name),
    );
  }

  const skippedServers: string[] = [];
  const processedServers: string[] = [];

  for (const mcpServerTemplate of filteredMcpServerTemplates) {
    let tools: Tool[];

    // 動的にツールを取得
    // mcpEnvMockKeys.ts からモック環境変数を取得
    const envVars = mcpServerTemplate.envVarKeys.reduce<Record<string, string>>(
      (acc, envVarKey) => {
        acc[envVarKey] = MCP_ENV_MOCK_KEYS[envVarKey] ?? "";
        return acc;
      },
      {},
    );

    try {
      // ツール一覧を取得
      tools = await getMcpServerTools(mcpServerTemplate, envVars);
    } catch (error) {
      console.error(
        `❌ ${mcpServerTemplate.name}: ツール取得エラー`,
        error instanceof Error ? error.message : error,
      );
      skippedServers.push(mcpServerTemplate.name);
      continue;
    }

    if (tools.length === 0) {
      console.log(
        `⚠️  ${mcpServerTemplate.name}: ツールが見つかりませんでした`,
      );
      skippedServers.push(mcpServerTemplate.name);
      continue;
    }

    try {
      const upsertPromises = tools.map((tool: Tool) => {
        return db.mcpTool.upsert({
          where: {
            mcpServerTemplateId_name: {
              mcpServerTemplateId: mcpServerTemplate.id,
              name: tool.name,
            },
          },
          update: {
            description: tool.description,
            inputSchema: tool.inputSchema as object,
          },
          create: {
            mcpServerTemplateId: mcpServerTemplate.id,
            name: tool.name,
            description: tool.description ?? "",
            inputSchema: tool.inputSchema as object,
          },
        });
      });

      // データベースにツールを書き込む
      const upsertedTools = await db.$transaction(upsertPromises);

      console.log(
        `✅ ${mcpServerTemplate.name}: ${upsertedTools.length}個のツールを登録`,
      );
      processedServers.push(mcpServerTemplate.name);
    } catch (error) {
      console.error(
        `❌ ${mcpServerTemplate.name}: ツール登録エラー`,
        error instanceof Error ? error.message : error,
      );
      skippedServers.push(mcpServerTemplate.name);
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
