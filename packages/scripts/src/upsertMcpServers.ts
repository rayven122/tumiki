import { db, OFFICIAL_ORGANIZATION_ID } from "@tumiki/db/server";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";

import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * MCP サーバーテンプレートを登録する
 * @param validServerNames 有効なサーバー名のリスト（環境変数が設定されているサーバー）
 */
export const upsertMcpServers = async (validServerNames?: string[]) => {
  const mcpServerTemplates = await db.mcpServerTemplate.findMany({
    // 作成者が設定されていないMCPサーバーテンプレートを取得
    where: {
      createdBy: null,
    },
  });

  // 有効なサーバーのみをフィルタリング
  const serversToUpsert = validServerNames
    ? MCP_SERVERS.filter((server) => validServerNames.includes(server.name))
    : MCP_SERVERS;

  // スキップされたサーバーを特定
  const skippedServers = MCP_SERVERS.filter(
    (server) => !serversToUpsert.includes(server),
  );

  if (skippedServers.length > 0) {
    console.log(
      "📝 以下のMCPサーバーは環境変数が不足しているためスキップされました:",
    );
    skippedServers.forEach((server) => {
      console.log(`  - ${server.name}`);
    });
    console.log("");
  }

  const upsertPromises = serversToUpsert.map((serverData) => {
    const existingTemplate = mcpServerTemplates.find(
      (template) => template.name === serverData.name,
    );

    return db.mcpServerTemplate.upsert({
      where: { id: existingTemplate ? existingTemplate.id : "" },
      update: {
        ...serverData,
        normalizedName: normalizeServerName(serverData.name),
        organizationId: OFFICIAL_ORGANIZATION_ID,
        visibility: "PUBLIC",
      },
      create: {
        ...serverData,
        normalizedName: normalizeServerName(serverData.name),
        organizationId: OFFICIAL_ORGANIZATION_ID,
        visibility: "PUBLIC",
      },
    });
  });
  const upsertedMcpServerTemplates = await db.$transaction(upsertPromises);

  console.log("✅ MCPサーバーテンプレートが正常に登録されました:");
  console.log(
    `  登録されたMCPサーバーテンプレート数: ${upsertedMcpServerTemplates.length}`,
  );
  console.log(
    "  登録されたMCPサーバーテンプレート:",
    upsertedMcpServerTemplates.map((template) => template.name).join(", "),
  );
};
