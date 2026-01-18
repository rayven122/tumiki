import {
  AuthType,
  db,
  OFFICIAL_ORGANIZATION_ID,
  OFFICIAL_USER_ID,
  PiiMaskingMode,
  ServerStatus,
  ServerType,
} from "@tumiki/db/server";

import { UNIFIED_MCP_SERVERS } from "./constants/unifiedMcpServers";
import { normalizeServerName } from "./utils/normalizeServerName";

/**
 * 公式ユーザーと組織が存在しない場合は作成する
 */
const ensureOfficialUserAndOrganization = async () => {
  // 公式ユーザーの存在確認と作成
  const existingUser = await db.user.findUnique({
    where: { id: OFFICIAL_USER_ID },
  });

  if (!existingUser) {
    await db.user.create({
      data: {
        id: OFFICIAL_USER_ID,
        email: "official@tumiki.app",
        name: "Official User",
        emailVerified: new Date(),
      },
    });
    console.log("  ✓ 公式ユーザーを作成しました");
  }

  // 公式組織の存在確認と作成
  const existingOrg = await db.organization.findUnique({
    where: { id: OFFICIAL_ORGANIZATION_ID },
  });

  if (!existingOrg) {
    await db.organization.create({
      data: {
        id: OFFICIAL_ORGANIZATION_ID,
        name: "Official Organization",
        slug: "official",
        description: "公式MCPサーバー用の組織",
        isPersonal: false,
        maxMembers: 1,
        createdBy: OFFICIAL_USER_ID,
      },
    });
    console.log("  ✓ 公式組織を作成しました");
  }
};

/**
 * 統合MCPサーバー（serverType=UNIFIED）と関連データを登録する
 *
 * 新アーキテクチャ:
 * - UNIFIED サーバーは templateInstances を直接持つ
 * - 中間の McpServer は作成しない
 * - 各テンプレートは normalizedName で識別される
 *
 * @param validServerNames 有効なサーバー名のリスト（環境変数が設定されているサーバー）
 */
export const upsertUnifiedMcpServers = async (validServerNames?: string[]) => {
  console.log("🔗 統合MCPサーバー（UNIFIED）の登録を開始します...\n");

  // 公式ユーザーと組織を確保
  await ensureOfficialUserAndOrganization();

  // 有効なテンプレートのみを含む定義をフィルタリング
  const serversToUpsert = UNIFIED_MCP_SERVERS.map((definition) => {
    const availableTemplates = validServerNames
      ? definition.childServerNames.filter((name) =>
          validServerNames.includes(name),
        )
      : definition.childServerNames;

    return {
      ...definition,
      availableTemplateNames: availableTemplates,
    };
  }).filter((definition) => definition.availableTemplateNames.length > 0);

  // スキップされた定義を特定
  const skippedDefinitions = UNIFIED_MCP_SERVERS.filter(
    (def) => !serversToUpsert.some((s) => s.name === def.name),
  );

  if (skippedDefinitions.length > 0) {
    console.log(
      "📝 以下の統合MCPサーバーはテンプレートが利用不可のためスキップされました:",
    );
    skippedDefinitions.forEach((def) => {
      console.log(`  - ${def.name}`);
    });
    console.log("");
  }

  const upsertedServers: string[] = [];

  for (const definition of serversToUpsert) {
    console.log(`📦 ${definition.name} を処理中...`);

    // テンプレートを取得
    const templates = await db.mcpServerTemplate.findMany({
      where: {
        name: { in: definition.availableTemplateNames },
        organizationId: OFFICIAL_ORGANIZATION_ID,
      },
      include: {
        mcpTools: true,
      },
    });

    if (templates.length === 0) {
      console.log(
        `  ⚠️ ${definition.name}: テンプレートが見つかりません。スキップします。`,
      );
      continue;
    }

    // 見つからなかったテンプレートを警告
    const foundNames = templates.map((t) => t.name);
    const missingNames = definition.availableTemplateNames.filter(
      (name) => !foundNames.includes(name),
    );
    if (missingNames.length > 0) {
      console.log(
        `  ⚠️ 以下のテンプレートが見つかりませんでした: ${missingNames.join(", ")}`,
      );
    }

    // 既存の統合MCPサーバー（serverType=UNIFIED）を確認（名前と組織IDで一意）
    const existingUnifiedServer = await db.mcpServer.findFirst({
      where: {
        name: definition.name,
        organizationId: OFFICIAL_ORGANIZATION_ID,
        serverType: ServerType.UNIFIED,
        deletedAt: null,
      },
      include: {
        templateInstances: true,
      },
    });

    // トランザクションで処理
    await db.$transaction(async (tx) => {
      if (existingUnifiedServer) {
        // 既存の統合MCPサーバーを更新
        // 既存の templateInstances を削除して再作成
        await tx.mcpServerTemplateInstance.deleteMany({
          where: { mcpServerId: existingUnifiedServer.id },
        });

        await tx.mcpServer.update({
          where: { id: existingUnifiedServer.id },
          data: {
            description: definition.description,
            updatedAt: new Date(),
            templateInstances: {
              create: templates.map((template, index) => ({
                mcpServerTemplateId: template.id,
                normalizedName: normalizeServerName(template.name),
                isEnabled: true,
                displayOrder: index,
                allowedTools: {
                  connect: template.mcpTools.map((tool) => ({ id: tool.id })),
                },
              })),
            },
          },
        });

        console.log(`  ✓ 統合MCPサーバー 更新: ${definition.name}`);
        templates.forEach((template) => {
          console.log(
            `    → テンプレートインスタンス: ${normalizeServerName(template.name)}`,
          );
        });
      } else {
        // 新規作成（serverType=UNIFIED として McpServer を作成）
        // templateInstances を直接作成
        await tx.mcpServer.create({
          data: {
            name: definition.name,
            description: definition.description,
            organizationId: OFFICIAL_ORGANIZATION_ID,
            serverType: ServerType.UNIFIED,
            serverStatus: ServerStatus.RUNNING,
            authType: AuthType.NONE,
            piiMaskingMode: PiiMaskingMode.DISABLED,
            piiInfoTypes: [],
            toonConversionEnabled: false,
            displayOrder: 0,
            templateInstances: {
              create: templates.map((template, index) => ({
                mcpServerTemplateId: template.id,
                normalizedName: normalizeServerName(template.name),
                isEnabled: true,
                displayOrder: index,
                allowedTools: {
                  connect: template.mcpTools.map((tool) => ({ id: tool.id })),
                },
              })),
            },
          },
        });

        console.log(`  ✓ 統合MCPサーバー 作成: ${definition.name}`);
        templates.forEach((template) => {
          console.log(
            `    → テンプレートインスタンス: ${normalizeServerName(template.name)}`,
          );
        });
      }
    });

    upsertedServers.push(definition.name);
  }

  console.log("");
  console.log("✅ 統合MCPサーバーが正常に登録されました:");
  console.log(`  登録された統合MCPサーバー数: ${upsertedServers.length}`);
  if (upsertedServers.length > 0) {
    console.log(`  登録された統合MCPサーバー: ${upsertedServers.join(", ")}`);
  }
};
