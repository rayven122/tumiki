import { db, OFFICIAL_ORGANIZATION_ID } from "@tumiki/db/server";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";

import { STDIO_MCP_SERVERS } from "./constants/stdioMcpServers";

/**
 * STDIO MCP サーバーテンプレートを登録する
 *
 * mcp-wrapper で動的に起動される環境変数ベースの MCP サーバーを登録
 */
export const upsertStdioMcpServers = async () => {
  // 既存の STDIO テンプレートを取得
  const existingTemplates = await db.mcpServerTemplate.findMany({
    where: {
      transportType: "STDIO",
      organizationId: OFFICIAL_ORGANIZATION_ID,
    },
  });

  const upsertPromises = STDIO_MCP_SERVERS.map((serverData) => {
    const normalizedName = normalizeServerName(serverData.name);
    const existingTemplate = existingTemplates.find(
      (template) => template.normalizedName === normalizedName,
    );

    return db.mcpServerTemplate.upsert({
      where: { id: existingTemplate ? existingTemplate.id : "" },
      update: {
        name: serverData.name,
        normalizedName,
        description: serverData.description,
        tags: serverData.tags,
        iconPath: serverData.iconPath,
        transportType: serverData.transportType,
        command: serverData.command,
        args: serverData.args,
        envVarKeys: serverData.envVarKeys,
        authType: serverData.authType,
        visibility: serverData.visibility,
        organizationId: OFFICIAL_ORGANIZATION_ID,
      },
      create: {
        name: serverData.name,
        normalizedName,
        description: serverData.description,
        tags: serverData.tags,
        iconPath: serverData.iconPath,
        transportType: serverData.transportType,
        command: serverData.command,
        args: serverData.args,
        envVarKeys: serverData.envVarKeys,
        authType: serverData.authType,
        visibility: serverData.visibility,
        organizationId: OFFICIAL_ORGANIZATION_ID,
      },
    });
  });

  const upsertedTemplates = await db.$transaction(upsertPromises);

  console.log("✅ STDIO MCP サーバーテンプレートが正常に登録されました:");
  console.log(`  登録数: ${upsertedTemplates.length}`);
  console.log(
    "  登録されたサーバー:",
    upsertedTemplates.map((t) => t.normalizedName).join(", "),
  );

  return upsertedTemplates;
};

// CLI から直接実行できるようにする
const main = async () => {
  try {
    await upsertStdioMcpServers();
    process.exit(0);
  } catch (error) {
    console.error(
      "❌ STDIO MCP サーバーテンプレートの登録に失敗しました:",
      error,
    );
    process.exit(1);
  }
};

void main();
