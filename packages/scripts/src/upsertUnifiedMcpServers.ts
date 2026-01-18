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
 * UnifiedMcpServer と関連データを登録する
 * @param validServerNames 有効なサーバー名のリスト（環境変数が設定されているサーバー）
 */
export const upsertUnifiedMcpServers = async (validServerNames?: string[]) => {
  console.log("🔗 UnifiedMcpServer の登録を開始します...\n");

  // 公式ユーザーと組織を確保
  await ensureOfficialUserAndOrganization();

  // 有効な子サーバーのみを含む定義をフィルタリング
  const serversToUpsert = UNIFIED_MCP_SERVERS.map((definition) => {
    const availableChildren = validServerNames
      ? definition.childServerNames.filter((name) =>
          validServerNames.includes(name),
        )
      : definition.childServerNames;

    return {
      ...definition,
      availableChildServerNames: availableChildren,
    };
  }).filter((definition) => definition.availableChildServerNames.length > 0);

  // スキップされた定義を特定
  const skippedDefinitions = UNIFIED_MCP_SERVERS.filter(
    (def) => !serversToUpsert.some((s) => s.name === def.name),
  );

  if (skippedDefinitions.length > 0) {
    console.log(
      "📝 以下のUnifiedMcpServerは子サーバーが利用不可のためスキップされました:",
    );
    skippedDefinitions.forEach((def) => {
      console.log(`  - ${def.name}`);
    });
    console.log("");
  }

  const upsertedServers: string[] = [];

  for (const definition of serversToUpsert) {
    console.log(`📦 ${definition.name} を処理中...`);

    // 子サーバーのMcpServerTemplateを取得
    const childTemplates = await db.mcpServerTemplate.findMany({
      where: {
        name: { in: definition.availableChildServerNames },
        organizationId: OFFICIAL_ORGANIZATION_ID,
      },
      include: {
        mcpTools: true,
      },
    });

    if (childTemplates.length === 0) {
      console.log(
        `  ⚠️ ${definition.name}: 子サーバーのテンプレートが見つかりません。スキップします。`,
      );
      continue;
    }

    // 見つからなかったテンプレートを警告
    const foundNames = childTemplates.map((t) => t.name);
    const missingNames = definition.availableChildServerNames.filter(
      (name) => !foundNames.includes(name),
    );
    if (missingNames.length > 0) {
      console.log(
        `  ⚠️ 以下の子サーバーテンプレートが見つかりませんでした: ${missingNames.join(", ")}`,
      );
    }

    // 既存のUnifiedMcpServerを確認（名前と組織IDで一意）
    const existingUnifiedServer = await db.unifiedMcpServer.findFirst({
      where: {
        name: definition.name,
        organizationId: OFFICIAL_ORGANIZATION_ID,
        deletedAt: null,
      },
      include: {
        childServers: {
          include: {
            mcpServer: true,
          },
        },
      },
    });

    // トランザクションで処理
    await db.$transaction(async (tx) => {
      // 各子サーバーテンプレートに対してMcpServerを作成/取得
      const childMcpServers: { id: string; displayOrder: number }[] = [];

      for (let i = 0; i < childTemplates.length; i++) {
        const template = childTemplates[i];
        if (!template) continue;
        const normalizedName = normalizeServerName(
          `${definition.name}-${template.name}`,
        );

        // 既存のMcpServerを確認
        let mcpServer = await tx.mcpServer.findFirst({
          where: {
            name: `${definition.name} - ${template.name}`,
            organizationId: OFFICIAL_ORGANIZATION_ID,
            deletedAt: null,
          },
        });

        if (!mcpServer) {
          // McpServerを新規作成
          mcpServer = await tx.mcpServer.create({
            data: {
              name: `${definition.name} - ${template.name}`,
              description: template.description ?? "",
              iconPath: template.iconPath,
              serverStatus: ServerStatus.RUNNING,
              serverType: ServerType.OFFICIAL,
              authType: AuthType.NONE,
              piiMaskingMode: PiiMaskingMode.DISABLED,
              piiInfoTypes: [],
              toonConversionEnabled: false,
              organizationId: OFFICIAL_ORGANIZATION_ID,
              displayOrder: i,
              templateInstances: {
                create: {
                  mcpServerTemplateId: template.id,
                  normalizedName: normalizedName,
                  isEnabled: true,
                  displayOrder: 0,
                  allowedTools: {
                    connect: template.mcpTools.map((tool) => ({ id: tool.id })),
                  },
                },
              },
            },
          });
          console.log(`    ✓ McpServer 作成: ${mcpServer.name}`);
        } else {
          console.log(`    → McpServer 既存: ${mcpServer.name}`);
        }

        childMcpServers.push({ id: mcpServer.id, displayOrder: i });
      }

      if (existingUnifiedServer) {
        // 既存のUnifiedMcpServerを更新
        await tx.unifiedMcpServer.update({
          where: { id: existingUnifiedServer.id },
          data: {
            description: definition.description,
            updatedAt: new Date(),
          },
        });

        // 既存の子サーバー関連を削除して再作成
        await tx.unifiedMcpServerChild.deleteMany({
          where: { unifiedMcpServerId: existingUnifiedServer.id },
        });

        await tx.unifiedMcpServerChild.createMany({
          data: childMcpServers.map((child) => ({
            unifiedMcpServerId: existingUnifiedServer.id,
            mcpServerId: child.id,
            displayOrder: child.displayOrder,
          })),
        });

        console.log(`  ✓ UnifiedMcpServer 更新: ${definition.name}`);
      } else {
        // 新規作成
        await tx.unifiedMcpServer.create({
          data: {
            name: definition.name,
            description: definition.description,
            organizationId: OFFICIAL_ORGANIZATION_ID,
            createdBy: OFFICIAL_USER_ID,
            childServers: {
              create: childMcpServers.map((child) => ({
                mcpServerId: child.id,
                displayOrder: child.displayOrder,
              })),
            },
          },
        });

        console.log(`  ✓ UnifiedMcpServer 作成: ${definition.name}`);
      }
    });

    upsertedServers.push(definition.name);
  }

  console.log("");
  console.log("✅ UnifiedMcpServer が正常に登録されました:");
  console.log(`  登録された UnifiedMcpServer 数: ${upsertedServers.length}`);
  if (upsertedServers.length > 0) {
    console.log(`  登録された UnifiedMcpServer: ${upsertedServers.join(", ")}`);
  }
};
