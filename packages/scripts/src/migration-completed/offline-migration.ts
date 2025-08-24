#!/usr/bin/env tsx
/**
 * オフライン移行スクリプト
 * バックアップDBから新しいスキーマの本番DBへデータを移行
 *
 * 実行方法:
 * BACKUP_DATABASE_URL=postgresql://... DATABASE_URL=postgresql://... \
 * pnpm tsx packages/scripts/src/migration-completed/offline-migration.ts
 *
 * 注意: このスクリプトは古いスキーマから新しいスキーマへの移行用です。
 * 現在のPrismaスキーマと古いバックアップDBのスキーマに差異がある場合、
 * 型エラーが発生する可能性がありますが、実際の移行処理には影響しません。
 *
 * 主な差分:
 * - Tool: isDeleted → isEnabled への変更
 * - UserToolGroupTool: userToolGroupId → toolGroupId への変更
 * - UserMcpServerInstanceToolGroup: 同様の変更
 * - McpServerRequestData: フィールド名の変更
 * - Chat/Message/Stream: スキーマ構造の変更
 * - Document: 複合ユニークキーの追加
 * - Vote: ユニークキーの変更
 * - WaitingList/Organization関連: フィールドの変更
 */
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// 環境変数を読み込む
config({ path: resolve(process.cwd(), ".env") });

// バックアップDB用のクライアント
const backupDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BACKUP_DATABASE_URL,
    },
  },
});

// 本番DB用のクライアント
const productionDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * 進捗表示用のヘルパー
 */
const logProgress = (message: string, emoji = "📦") => {
  console.log(`${emoji} ${message}`);
};

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`);
};

const logError = (message: string) => {
  console.error(`❌ ${message}`);
};

const logInfo = (message: string) => {
  console.log(`ℹ️  ${message}`);
};

const logWarning = (message: string) => {
  console.log(`⚠️  ${message}`);
};

/**
 * メイン移行処理
 */
async function migrateData() {
  logProgress("オフライン移行を開始します...", "🚀");

  try {
    // 環境変数チェック
    if (!process.env.BACKUP_DATABASE_URL) {
      throw new Error("BACKUP_DATABASE_URL が設定されていません");
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL が設定されていません");
    }

    // ========================================
    // Phase 1: 基本データの移行
    // ========================================
    logProgress("Phase 1: 基本データの移行", "1️⃣");

    // 1. ユーザーデータの移行
    logProgress("ユーザーデータを移行中...");
    const users = await backupDb.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    for (const user of users) {
      await productionDb.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          // hasCompletedOnboarding フィールドは削除されたため除外
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        update: {
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          updatedAt: user.updatedAt,
        },
      });
    }
    logSuccess(`${users.length} 件のユーザーを移行しました`);

    // 2. 既存の組織データの移行
    logProgress("既存の組織データを移行中...");
    const organizations = await backupDb.organization.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        isDeleted: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    for (const org of organizations) {
      await productionDb.organization.upsert({
        where: { id: org.id },
        create: {
          id: org.id,
          name: org.name,
          description: org.description,
          logoUrl: org.logoUrl,
          isDeleted: org.isDeleted,
          // mainブランチではデフォルト値が変更されている（バックアップDBには存在しないフィールド）
          isPersonal: true, // デフォルト値
          maxMembers: 1, // デフォルト値
          createdBy: org.createdBy,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        },
        update: {
          name: org.name,
          description: org.description,
          logoUrl: org.logoUrl,
          isDeleted: org.isDeleted,
          updatedAt: org.updatedAt,
        },
      });
    }
    logSuccess(`${organizations.length} 件の組織を移行しました`);

    // 3. 組織メンバーの移行
    logProgress("組織メンバーデータを移行中...");
    const members = await backupDb.organizationMember.findMany();
    for (const member of members) {
      await productionDb.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: member.organizationId,
            userId: member.userId,
          },
        },
        create: member as any,
        update: {
          isAdmin: member.isAdmin,
          updatedAt: member.updatedAt,
        },
      });
    }
    logSuccess(`${members.length} 件の組織メンバーを移行しました`);

    // ========================================
    // Phase 2: 個人組織の作成
    // ========================================
    logProgress("Phase 2: 個人組織の作成", "2️⃣");

    // 全ユーザーの個人組織状況を確認
    const allUsersForOrgCheck = await productionDb.user.findMany({
      include: {
        members: {
          include: {
            organization: true,
          },
        },
      },
    });

    const usersNeedingPersonalOrg = [];
    const orgIdMap = new Map<string, string>(); // userId -> organizationId

    for (const user of allUsersForOrgCheck) {
      // 既存の個人組織を検索
      const existingPersonalOrg = user.members.find(
        (member) =>
          member.organization.isPersonal &&
          member.organization.createdBy === user.id,
      )?.organization;

      if (existingPersonalOrg) {
        // 既存個人組織がある場合
        orgIdMap.set(user.id, existingPersonalOrg.id);

        // defaultOrganizationIdが未設定の場合のみ更新
        if (!user.defaultOrganizationId) {
          await productionDb.user.update({
            where: { id: user.id },
            data: { defaultOrganizationId: existingPersonalOrg.id },
          });
          logInfo(
            `ユーザー ${user.email || user.id} の defaultOrganizationId を設定しました`,
          );
        }
      } else {
        // 個人組織が存在しない場合
        usersNeedingPersonalOrg.push(user);
      }
    }

    logInfo(
      `${usersNeedingPersonalOrg.length} 人のユーザーに個人組織を作成します`,
    );

    for (const user of usersNeedingPersonalOrg) {
      try {
        // 冪等性を担保するため、作成前に再度確認
        const existingPersonalOrg = await productionDb.organization.findFirst({
          where: {
            createdBy: user.id,
            isPersonal: true,
          },
        });

        if (existingPersonalOrg) {
          // 既に存在する場合はスキップ
          orgIdMap.set(user.id, existingPersonalOrg.id);
          logWarning(
            `ユーザー ${user.email || user.id} の個人組織は既に存在します`,
          );
          continue;
        }

        // 個人組織を作成
        const personalOrg = await productionDb.organization.create({
          data: {
            name: `${user.name || user.email || "User"}'s Workspace`,
            description: "Personal workspace",
            isPersonal: true,
            maxMembers: 1,
            createdBy: user.id,
          },
        });

        // 組織メンバーを作成
        await productionDb.organizationMember.create({
          data: {
            organizationId: personalOrg.id,
            userId: user.id,
            isAdmin: true,
          },
        });

        // defaultOrganizationId を設定
        await productionDb.user.update({
          where: { id: user.id },
          data: { defaultOrganizationId: personalOrg.id },
        });

        orgIdMap.set(user.id, personalOrg.id);
        logSuccess(
          `ユーザー ${user.email || user.id} の個人組織を作成しました`,
        );
      } catch (error) {
        // 制約違反エラー等をキャッチして冪等性を担保
        if (error.code === "P2002") {
          // ユニーク制約違反の場合（同時実行時に発生する可能性）
          logWarning(
            `ユーザー ${user.email || user.id} の個人組織作成時に制約違反（既存の可能性）`,
          );

          // 既存組織を取得してマップに追加
          const existingPersonalOrg = await productionDb.organization.findFirst(
            {
              where: {
                createdBy: user.id,
                isPersonal: true,
              },
            },
          );

          if (existingPersonalOrg) {
            orgIdMap.set(user.id, existingPersonalOrg.id);
          }
        } else {
          logError(
            `ユーザー ${user.email || user.id} の個人組織作成でエラー: ${error}`,
          );
        }
      }
    }

    // ========================================
    // Phase 2.5: 全ユーザーの個人組織マッピング構築
    // ========================================
    logProgress("Phase 2.5: 全ユーザーの個人組織マッピング構築", "🔄");

    // 全ユーザーの個人組織を取得してマップに追加
    const allUsers = await productionDb.user.findMany({
      include: {
        members: {
          include: {
            organization: true,
          },
        },
      },
    });

    const userToPersonalOrgMap = new Map<string, string>();

    for (const user of allUsers) {
      // 個人組織を探す（isPersonal=true かつ createdBy=userId）
      const personalOrg = user.members.find(
        (member) =>
          member.organization.isPersonal &&
          member.organization.createdBy === user.id,
      )?.organization;

      if (personalOrg) {
        userToPersonalOrgMap.set(user.id, personalOrg.id);
      } else {
        logWarning(
          `ユーザー ${user.email || user.id} の個人組織が見つかりません`,
        );
      }
    }

    logSuccess(
      `${userToPersonalOrgMap.size} 人のユーザー個人組織マッピングを構築しました`,
    );

    // ========================================
    // Phase 3: MCPサーバー関連データの移行
    // ========================================
    logProgress("Phase 3: MCPサーバー関連データの移行", "3️⃣");

    // 1. MCPサーバー定義の移行
    logProgress("MCPサーバー定義を移行中...");
    const mcpServers = await backupDb.mcpServer.findMany();
    for (const server of mcpServers) {
      await productionDb.mcpServer.upsert({
        where: { id: server.id },
        create: server as any,
        update: {
          name: server.name,
          description: server.description,
          logoUrl: server.logoUrl,
          repositoryUrl: server.repositoryUrl,
          documentationUrl: server.documentationUrl,
          isOfficial: server.isOfficial,
          defaultArgs: server.defaultArgs,
          defaultEnv: server.defaultEnv,
          npmPackageName: server.npmPackageName,
          npmVersion: server.npmVersion,
          executablePath: server.executablePath,
          isDeleted: server.isDeleted,
          updatedAt: server.updatedAt,
        },
      });
    }
    logSuccess(`${mcpServers.length} 件のMCPサーバー定義を移行しました`);

    // 2. UserMcpServerConfigの移行（organizationId設定）
    logProgress("MCPサーバー設定を移行中...");
    // organizationIdがnullでuserIdが存在するレコード、またはorganizationIdが存在するレコードを取得
    const configs = await backupDb.$queryRaw`
      SELECT * FROM "UserMcpServerConfig" 
      WHERE ("organizationId" IS NULL AND "userId" IS NOT NULL) OR "organizationId" IS NOT NULL
    `;
    let configMigrated = 0;
    let configSkipped = 0;

    for (const config of configs) {
      // userId フィールドが削除されたため、organizationId を特定
      const userId = (config as any).userId;
      const organizationId =
        (config as any).organizationId || userToPersonalOrgMap.get(userId);

      if (!organizationId) {
        logError(
          `UserMcpServerConfig (ID: ${config.id}) の organizationId が特定できません - userId: ${userId}`,
        );
        configSkipped++;
        continue;
      }

      // userId と oauthScopes, tools を除外してマイグレーション
      const { userId: _, oauthScopes, tools, ...configData } = config as any;

      await productionDb.userMcpServerConfig.upsert({
        where: { id: config.id },
        create: {
          ...configData,
          organizationId,
        },
        update: {
          ...configData,
          organizationId,
        },
      });
      configMigrated++;
    }
    logSuccess(`${configMigrated} 件のMCPサーバー設定を移行しました`);
    if (configSkipped > 0) {
      logWarning(`${configSkipped} 件のMCPサーバー設定をスキップしました`);
    }

    // 3. UserToolGroupの移行
    logProgress("ツールグループを移行中...");
    // organizationIdがnullでuserIdが存在するレコード、またはorganizationIdが存在するレコードを取得
    const toolGroups = await backupDb.$queryRaw`
      SELECT * FROM "UserToolGroup" 
      WHERE ("organizationId" IS NULL AND "userId" IS NOT NULL) OR "organizationId" IS NOT NULL
    `;
    let toolGroupMigrated = 0;
    let toolGroupSkipped = 0;

    for (const group of toolGroups) {
      // userId フィールドが削除されたため、organizationId を特定
      const userId = (group as any).userId;
      const organizationId =
        (group as any).organizationId || userToPersonalOrgMap.get(userId);

      if (!organizationId) {
        logError(
          `UserToolGroup (ID: ${group.id}) の organizationId が特定できません - userId: ${userId}`,
        );
        toolGroupSkipped++;
        continue;
      }

      // userId を除外してマイグレーション
      const { userId: _, ...groupData } = group as any;

      await productionDb.userToolGroup.upsert({
        where: { id: group.id },
        create: {
          ...groupData,
          organizationId,
        },
        update: {
          ...groupData,
          organizationId,
        },
      });
      toolGroupMigrated++;
    }
    logSuccess(`${toolGroupMigrated} 件のツールグループを移行しました`);
    if (toolGroupSkipped > 0) {
      logWarning(`${toolGroupSkipped} 件のツールグループをスキップしました`);
    }

    // 4. UserMcpServerInstanceの移行
    logProgress("MCPサーバーインスタンスを移行中...");
    // organizationIdがnullでuserIdが存在するレコード、またはorganizationIdが存在するレコードを取得
    const instances = await backupDb.$queryRaw`
      SELECT * FROM "UserMcpServerInstance" 
      WHERE ("organizationId" IS NULL AND "userId" IS NOT NULL) OR "organizationId" IS NOT NULL
    `;
    let instanceMigrated = 0;
    let instanceSkipped = 0;

    for (const instance of instances) {
      // userId フィールドが削除されたため、organizationId を特定
      const userId = (instance as any).userId;
      const organizationId =
        (instance as any).organizationId || userToPersonalOrgMap.get(userId);

      if (!organizationId) {
        logError(
          `UserMcpServerInstance (ID: ${instance.id}) の organizationId が特定できません - userId: ${userId}`,
        );
        instanceSkipped++;
        continue;
      }

      // userId を除外してマイグレーション
      const { userId: _, ...instanceData } = instance as any;

      await productionDb.userMcpServerInstance.upsert({
        where: { id: instance.id },
        create: {
          ...instanceData,
          organizationId,
        },
        update: {
          ...instanceData,
          organizationId,
        },
      });
      instanceMigrated++;
    }
    logSuccess(`${instanceMigrated} 件のMCPサーバーインスタンスを移行しました`);
    if (instanceSkipped > 0) {
      logWarning(
        `${instanceSkipped} 件のMCPサーバーインスタンスをスキップしました`,
      );
    }

    // 5. McpServerRequestLogの移行
    logProgress("リクエストログを移行中...");

    // 既存のログ数を確認
    const existingLogCount = await productionDb.mcpServerRequestLog.count();

    if (existingLogCount > 0) {
      logInfo(
        `既に ${existingLogCount} 件のリクエストログが存在するため、移行をスキップします`,
      );
    } else {
      // organizationIdがnullでuserIdが存在するレコード、またはorganizationIdが存在するレコードを取得
      const logs = await backupDb.$queryRaw`
        SELECT * FROM "McpServerRequestLog" 
        WHERE (("organizationId" IS NULL AND "userId" IS NOT NULL) OR "organizationId" IS NOT NULL)
        LIMIT 10000
      `;
      let logMigrated = 0;
      let logSkipped = 0;

      for (const log of logs) {
        // userIdからorganizationIdを特定
        const userId = (log as any).userId;
        let organizationId = (log as any).organizationId;

        if (!organizationId && userId) {
          organizationId = userToPersonalOrgMap.get(userId);
        }

        if (!organizationId) {
          // organizationIdが特定できない場合はスキップ（古いログ）
          logSkipped++;
          continue;
        }

        // userId を除外してマイグレーション
        const { userId: _, ...logData } = log as any;

        await productionDb.mcpServerRequestLog.create({
          data: {
            ...logData,
            organizationId,
          },
        });
        logMigrated++;
      }
      logSuccess(`${logMigrated} 件のリクエストログを移行しました`);
      if (logSkipped > 0) {
        logInfo(
          `${logSkipped} 件のリクエストログをスキップしました（古いデータ）`,
        );
      }
    }

    // ========================================
    // Phase 4: その他のデータ移行
    // ========================================
    logProgress("Phase 4: その他のデータ移行", "4️⃣");

    // 1. McpApiKeyの移行（userIdフィールドが削除されたため、関連するインスタンスから特定）
    logProgress("APIキーを移行中...");
    const apiKeys = await backupDb.mcpApiKey.findMany();
    let apiKeyMigrated = 0;
    let apiKeySkipped = 0;

    // 存在するUserMcpServerInstanceのIDを事前に取得
    const existingInstances = await productionDb.userMcpServerInstance.findMany(
      {
        select: { id: true },
      },
    );
    const existingInstanceIds = new Set(
      existingInstances.map((inst) => inst.id),
    );

    for (const apiKey of apiKeys) {
      // userId フィールドを除外してマイグレーション
      const { userId, ...apiKeyData } = apiKey as any;

      // 関連するUserMcpServerInstanceが存在するかチェック
      if (!existingInstanceIds.has(apiKeyData.userMcpServerInstanceId)) {
        logError(
          `APIキー (ID: ${apiKey.id}) の関連インスタンス (${apiKeyData.userMcpServerInstanceId}) が存在しないためスキップ`,
        );
        apiKeySkipped++;
        continue;
      }

      try {
        await productionDb.mcpApiKey.upsert({
          where: { id: apiKey.id },
          create: apiKeyData,
          update: apiKeyData,
        });
        apiKeyMigrated++;
      } catch (error) {
        logError(`APIキー (ID: ${apiKey.id}) の移行に失敗しました: ${error}`);
        apiKeySkipped++;
      }
    }

    if (apiKeyMigrated > 0) {
      logSuccess(`${apiKeyMigrated} 件のAPIキーを移行しました`);
    }
    if (apiKeySkipped > 0) {
      logWarning(`${apiKeySkipped} 件のAPIキーをスキップしました`);
    }

    // 2. Toolの移行
    logProgress("ツール定義を移行中...");
    const tools = await backupDb.tool.findMany();
    let toolMigrated = 0;
    let toolSkipped = 0;

    for (const tool of tools) {
      try {
        // 複合ユニークキーで既存レコードを確認
        const existing = await productionDb.tool.findUnique({
          where: {
            mcpServerId_name: {
              mcpServerId: tool.mcpServerId,
              name: tool.name,
            },
          },
        });

        if (existing) {
          // 既存の場合は更新
          await productionDb.tool.update({
            where: {
              mcpServerId_name: {
                mcpServerId: tool.mcpServerId,
                name: tool.name,
              },
            },
            data: {
              description: tool.description,
              inputSchema: tool.inputSchema,
              // isDeleted → isEnabled の変換（古いスキーマとの互換性）
              isEnabled: !(tool as any).isDeleted,
              updatedAt: tool.updatedAt,
            },
          });
        } else {
          // 新規の場合は作成
          await productionDb.tool.create({
            data: {
              id: tool.id,
              mcpServerId: tool.mcpServerId,
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              // isDeleted → isEnabled の変換
              isEnabled: !(tool as any).isDeleted,
              createdAt: tool.createdAt,
              updatedAt: tool.updatedAt,
            },
          });
        }
        toolMigrated++;
      } catch (error) {
        logError(
          `Tool (mcpServerId: ${tool.mcpServerId}, name: ${tool.name}) の移行に失敗しました: ${error}`,
        );
        toolSkipped++;
      }
    }

    if (toolMigrated > 0) {
      logSuccess(`${toolMigrated} 件のツール定義を移行しました`);
    }
    if (toolSkipped > 0) {
      logWarning(`${toolSkipped} 件のツール定義をスキップしました`);
    }

    // 3. UserToolGroupToolの移行
    logProgress("ツールグループツール関係を移行中...");
    const toolGroupTools = await backupDb.userToolGroupTool.findMany();
    let toolGroupToolMigrated = 0;
    let toolGroupToolSkipped = 0;

    // 存在するUserToolGroupのIDを事前に取得
    const existingToolGroups = await productionDb.userToolGroup.findMany({
      select: { id: true },
    });
    const existingToolGroupIds = new Set(
      existingToolGroups.map((group) => group.id),
    );

    // 存在するToolのIDを事前に取得（名前ベースのマッピングも作成）
    const existingTools = await productionDb.tool.findMany({
      select: { id: true, name: true, mcpServerId: true },
    });
    const existingToolIds = new Set(existingTools.map((tool) => tool.id));

    // バックアップDBのツール情報を取得（名前マッピング用）
    const backupTools = await backupDb.tool.findMany({
      select: { id: true, name: true, mcpServerId: true },
    });

    // ツールIDマッピングを作成: 旧ID → 新ID
    const toolIdMapping = new Map<string, string>();
    for (const backupTool of backupTools) {
      const prodTool = existingTools.find(
        (t) =>
          t.name === backupTool.name &&
          t.mcpServerId === backupTool.mcpServerId,
      );
      if (prodTool) {
        toolIdMapping.set(backupTool.id, prodTool.id);
      }
    }

    for (const groupTool of toolGroupTools) {
      // バックアップDBのフィールド構造:
      // - userMcpServerConfigId: UserMcpServerConfigとの関連
      // - toolGroupId: UserToolGroupとの関連（これが正しいフィールド名）
      // - toolId: Toolとの関連
      const record = groupTool as any;
      const toolGroupId = record.toolGroupId; // 正しいフィールド名を使用

      if (!toolGroupId) {
        logWarning(
          `UserToolGroupTool にツールグループIDが見つかりません。スキップ`,
        );
        toolGroupToolSkipped++;
        continue;
      }

      // 関連するUserToolGroupが存在するかチェック
      if (!existingToolGroupIds.has(toolGroupId)) {
        // 存在しない場合はスキップ（ログは出さない：大量に出力されるため）
        toolGroupToolSkipped++;
        continue;
      }

      // ツールIDをマッピングして新しいIDを取得
      const mappedToolId = toolIdMapping.get(groupTool.toolId);
      if (!mappedToolId) {
        // マッピングが見つからない場合はスキップ（削除されたツール）
        toolGroupToolSkipped++;
        continue;
      }

      try {
        await productionDb.userToolGroupTool.upsert({
          where: {
            toolGroupId_userMcpServerConfigId_toolId: {
              toolGroupId: toolGroupId,
              userMcpServerConfigId: groupTool.userMcpServerConfigId,
              toolId: mappedToolId, // マッピングされた新しいIDを使用
            },
          },
          create: {
            toolGroupId: toolGroupId,
            toolId: mappedToolId, // マッピングされた新しいIDを使用
            userMcpServerConfigId: groupTool.userMcpServerConfigId,
            sortOrder: groupTool.sortOrder || 0,
            createdAt: groupTool.createdAt,
          },
          update: {
            sortOrder: groupTool.sortOrder || 0,
          },
        });
        toolGroupToolMigrated++;
      } catch (error) {
        logError(
          `UserToolGroupTool (GroupID: ${toolGroupId}, ToolID: ${groupTool.toolId}) の移行に失敗しました: ${error}`,
        );
        toolGroupToolSkipped++;
      }
    }

    if (toolGroupToolMigrated > 0) {
      logSuccess(
        `${toolGroupToolMigrated} 件のツールグループツール関係を移行しました`,
      );
    }
    if (toolGroupToolSkipped > 0) {
      logWarning(
        `${toolGroupToolSkipped} 件のツールグループツール関係をスキップしました`,
      );
    }

    // 4. UserMcpServerInstanceToolGroupの移行
    logProgress("MCPインスタンスツールグループ関係を移行中...");
    const instanceToolGroups =
      await backupDb.userMcpServerInstanceToolGroup.findMany();
    let instanceToolGroupMigrated = 0;
    let instanceToolGroupSkipped = 0;

    for (const instanceGroup of instanceToolGroups) {
      // フィールド名の変換
      const mcpServerInstanceId =
        (instanceGroup as any).userMcpServerInstanceId ||
        (instanceGroup as any).mcpServerInstanceId;
      const toolGroupId =
        (instanceGroup as any).userToolGroupId ||
        (instanceGroup as any).toolGroupId;

      if (!mcpServerInstanceId || !toolGroupId) {
        logWarning(
          `UserMcpServerInstanceToolGroup にインスタンスIDまたはツールグループIDが見つかりません`,
        );
        instanceToolGroupSkipped++;
        continue;
      }

      // 関連するインスタンスとツールグループが存在するかチェック
      if (!existingInstanceIds.has(mcpServerInstanceId)) {
        logWarning(
          `UserMcpServerInstanceToolGroup のインスタンス (${mcpServerInstanceId}) が存在しないためスキップ`,
        );
        instanceToolGroupSkipped++;
        continue;
      }

      if (!existingToolGroupIds.has(toolGroupId)) {
        logWarning(
          `UserMcpServerInstanceToolGroup のツールグループ (${toolGroupId}) が存在しないためスキップ`,
        );
        instanceToolGroupSkipped++;
        continue;
      }

      try {
        await productionDb.userMcpServerInstanceToolGroup.upsert({
          where: {
            mcpServerInstanceId_toolGroupId: {
              mcpServerInstanceId: mcpServerInstanceId,
              toolGroupId: toolGroupId,
            },
          },
          create: {
            mcpServerInstanceId: mcpServerInstanceId,
            toolGroupId: toolGroupId,
            sortOrder: (instanceGroup as any).sortOrder || 0,
            createdAt: instanceGroup.createdAt,
          },
          update: {
            sortOrder: (instanceGroup as any).sortOrder || 0,
          },
        });
        instanceToolGroupMigrated++;
      } catch (error) {
        logError(
          `UserMcpServerInstanceToolGroup の移行に失敗しました: ${error}`,
        );
        instanceToolGroupSkipped++;
      }
    }

    if (instanceToolGroupMigrated > 0) {
      logSuccess(
        `${instanceToolGroupMigrated} 件のMCPインスタンスツールグループ関係を移行しました`,
      );
    }
    if (instanceToolGroupSkipped > 0) {
      logWarning(
        `${instanceToolGroupSkipped} 件のMCPインスタンスツールグループ関係をスキップしました`,
      );
    }

    // 5. McpServerRequestDataの移行
    logProgress("MCPサーバーリクエストデータを移行中...");

    // 関連するRequestLogが存在するものだけを取得
    const requestDataRecords = await backupDb.$queryRaw`
      SELECT rd.* FROM "McpServerRequestData" rd
      INNER JOIN "McpServerRequestLog" rl ON rd."requestLogId" = rl.id
      LIMIT 10000
    `;

    let requestDataMigrated = 0;
    let requestDataSkipped = 0;

    // 存在するRequestLogのIDを事前に取得
    const existingLogs = await productionDb.mcpServerRequestLog.findMany({
      select: { id: true },
    });
    const existingLogIds = new Set(existingLogs.map((log) => log.id));

    for (const requestData of requestDataRecords as any[]) {
      // 関連するRequestLogが存在するかチェック
      if (!existingLogIds.has(requestData.requestLogId)) {
        // ログが存在しない場合はスキップ
        requestDataSkipped++;
        continue;
      }

      try {
        // フィールド名の変換が必要な場合
        const inputData =
          requestData.compressedData ||
          requestData.inputDataCompressed ||
          Buffer.from([]);
        const outputData = requestData.outputDataCompressed || Buffer.from([]);

        const dataToInsert = {
          id: requestData.id,
          requestLogId: requestData.requestLogId,
          inputDataCompressed: inputData,
          outputDataCompressed: outputData,
          originalInputSize:
            requestData.inputDataSize ||
            requestData.originalInputSize ||
            inputData.length,
          originalOutputSize:
            requestData.outputDataSize ||
            requestData.originalOutputSize ||
            outputData.length,
          compressedInputSize:
            requestData.compressedInputSize || inputData.length,
          compressedOutputSize:
            requestData.compressedOutputSize || outputData.length,
          compressionType: requestData.compressionType || "GZIP",
          compressionRatio: requestData.compressionRatio || 1.0,
          createdAt: requestData.createdAt,
        };

        await productionDb.mcpServerRequestData.upsert({
          where: { id: requestData.id },
          create: dataToInsert,
          update: {
            inputDataCompressed: dataToInsert.inputDataCompressed,
            outputDataCompressed: dataToInsert.outputDataCompressed,
            originalInputSize: dataToInsert.originalInputSize,
            originalOutputSize: dataToInsert.originalOutputSize,
            compressedInputSize: dataToInsert.compressedInputSize,
            compressedOutputSize: dataToInsert.compressedOutputSize,
            compressionType: dataToInsert.compressionType,
            compressionRatio: dataToInsert.compressionRatio,
          },
        });
        requestDataMigrated++;
      } catch (error) {
        // エラーログは表示しない（大量になる可能性があるため）
        requestDataSkipped++;
      }
    }

    if (requestDataMigrated > 0) {
      logSuccess(
        `${requestDataMigrated} 件のMCPサーバーリクエストデータを移行しました`,
      );
    }
    if (requestDataSkipped > 0) {
      logWarning(
        `${requestDataSkipped} 件のMCPサーバーリクエストデータをスキップしました`,
      );
    }

    // 6. Chat, Stream, Message, Suggestion, Voteの移行
    logProgress("チャット関連データを移行中...");

    // Chatの移行
    const chats = await backupDb.chat.findMany();
    for (const chat of chats) {
      // userIdからorganizationIdを特定
      const userId = (chat as any).userId;
      const organizationId = userToPersonalOrgMap.get(userId);

      if (!organizationId) {
        logWarning(`Chat (ID: ${chat.id}) の organizationId が特定できません`);
        continue;
      }

      const { userId: _, ...chatData } = chat as any;

      await productionDb.chat.upsert({
        where: { id: chat.id },
        create: {
          ...chatData,
          organizationId,
        },
        update: {
          ...chatData,
          organizationId,
        },
      });
    }
    logSuccess(`${chats.length} 件のチャットを移行しました`);

    // Streamの移行
    const streams = await backupDb.stream.findMany();
    for (const stream of streams) {
      await productionDb.stream.upsert({
        where: { id: stream.id },
        create: stream as any,
        update: {
          chatId: stream.chatId,
          title: stream.title,
          updatedAt: stream.updatedAt,
        },
      });
    }
    logSuccess(`${streams.length} 件のストリームを移行しました`);

    // Messageの移行
    const messages = await backupDb.message.findMany({
      take: 10000, // 大量のデータの場合は制限
    });
    for (const message of messages) {
      await productionDb.message.upsert({
        where: { id: message.id },
        create: message as any,
        update: {
          streamId: message.streamId,
          role: message.role,
          content: message.content,
          model: message.model,
          stop: message.stop,
          stopReason: message.stopReason,
          updatedAt: message.updatedAt,
        },
      });
    }
    logSuccess(`${messages.length} 件のメッセージを移行しました`);

    // Suggestionの移行
    const suggestions = await backupDb.suggestion.findMany();
    for (const suggestion of suggestions) {
      await productionDb.suggestion.upsert({
        where: { id: suggestion.id },
        create: suggestion as any,
        update: {
          messageId: suggestion.messageId,
          title: suggestion.title,
          updatedAt: suggestion.updatedAt,
        },
      });
    }
    logSuccess(`${suggestions.length} 件の提案を移行しました`);

    // Voteの移行
    const votes = await backupDb.vote.findMany();
    for (const vote of votes) {
      await productionDb.vote.upsert({
        where: { id: vote.id },
        create: vote as any,
        update: {
          messageId: vote.messageId,
          isUpvoted: vote.isUpvoted,
          updatedAt: vote.updatedAt,
        },
      });
    }
    logSuccess(`${votes.length} 件の投票を移行しました`);

    // 7. Documentの移行
    logProgress("ドキュメントを移行中...");
    const documents = await backupDb.document.findMany();
    for (const doc of documents) {
      // userIdからorganizationIdを特定
      const userId = (doc as any).userId;
      const organizationId = userToPersonalOrgMap.get(userId);

      if (!organizationId) {
        logWarning(
          `Document (ID: ${doc.id}) の organizationId が特定できません`,
        );
        continue;
      }

      const { userId: _, ...docData } = doc as any;

      await productionDb.document.upsert({
        where: { id: doc.id },
        create: {
          ...docData,
          organizationId,
        },
        update: {
          ...docData,
          organizationId,
        },
      });
    }
    logSuccess(`${documents.length} 件のドキュメントを移行しました`);

    // 8. WaitingListの移行
    logProgress("ウェイティングリストを移行中...");
    const waitingListEntries = await backupDb.waitingList.findMany();
    for (const entry of waitingListEntries) {
      await productionDb.waitingList.upsert({
        where: { id: entry.id },
        create: entry as any,
        update: {
          email: entry.email,
          name: entry.name,
          company: entry.company,
          role: entry.role,
          useCase: entry.useCase,
          status: entry.status,
          approvedAt: entry.approvedAt,
          approvedBy: entry.approvedBy,
          updatedAt: entry.updatedAt,
        },
      });
    }
    logSuccess(
      `${waitingListEntries.length} 件のウェイティングリストエントリーを移行しました`,
    );

    // 9. 組織関連の追加テーブルの移行
    logProgress("組織関連の追加テーブルを移行中...");

    // OrganizationGroupの移行
    const orgGroups = await backupDb.organizationGroup.findMany();
    for (const group of orgGroups) {
      await productionDb.organizationGroup.upsert({
        where: { id: group.id },
        create: group as any,
        update: {
          organizationId: group.organizationId,
          name: group.name,
          description: group.description,
          isDeleted: group.isDeleted,
          updatedAt: group.updatedAt,
        },
      });
    }
    logSuccess(`${orgGroups.length} 件の組織グループを移行しました`);

    // OrganizationRoleの移行
    const orgRoles = await backupDb.organizationRole.findMany();
    for (const role of orgRoles) {
      await productionDb.organizationRole.upsert({
        where: { id: role.id },
        create: role as any,
        update: {
          organizationId: role.organizationId,
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole,
          isDeleted: role.isDeleted,
          updatedAt: role.updatedAt,
        },
      });
    }
    logSuccess(`${orgRoles.length} 件の組織ロールを移行しました`);

    // RolePermissionの移行
    const rolePermissions = await backupDb.rolePermission.findMany();
    for (const permission of rolePermissions) {
      await productionDb.rolePermission.upsert({
        where: {
          roleId_resource_action: {
            roleId: permission.roleId,
            resource: permission.resource,
            action: permission.action,
          },
        },
        create: permission as any,
        update: {
          updatedAt: permission.updatedAt,
        },
      });
    }
    logSuccess(`${rolePermissions.length} 件のロール権限を移行しました`);

    // ResourceAccessControlの移行
    const accessControls = await backupDb.resourceAccessControl.findMany();
    for (const control of accessControls) {
      await productionDb.resourceAccessControl.upsert({
        where: { id: control.id },
        create: control as any,
        update: {
          organizationId: control.organizationId,
          resourceType: control.resourceType,
          resourceId: control.resourceId,
          principalType: control.principalType,
          principalId: control.principalId,
          permission: control.permission,
          updatedAt: control.updatedAt,
        },
      });
    }
    logSuccess(
      `${accessControls.length} 件のリソースアクセス制御を移行しました`,
    );

    // OrganizationInvitationの移行
    const invitations = await backupDb.organizationInvitation.findMany();
    for (const invitation of invitations) {
      await productionDb.organizationInvitation.upsert({
        where: { id: invitation.id },
        create: invitation as any,
        update: {
          organizationId: invitation.organizationId,
          email: invitation.email,
          roleId: invitation.roleId,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          acceptedAt: invitation.acceptedAt,
          acceptedBy: invitation.acceptedBy,
          status: invitation.status,
          updatedAt: invitation.updatedAt,
        },
      });
    }
    logSuccess(`${invitations.length} 件の組織招待を移行しました`);

    // ========================================
    // 完了
    // ========================================
    logSuccess("オフライン移行が完了しました！🎉");

    // 統計情報を表示
    const stats = {
      users: await productionDb.user.count(),
      organizations: await productionDb.organization.count(),
      personalOrgs: await productionDb.organization.count({
        where: { isPersonal: true },
      }),
      configs: await productionDb.userMcpServerConfig.count(),
      instances: await productionDb.userMcpServerInstance.count(),
    };

    console.log("\n📊 移行統計:");
    console.log(`  - ユーザー数: ${stats.users}`);
    console.log(`  - 組織数: ${stats.organizations}`);
    console.log(`  - 個人組織数: ${stats.personalOrgs}`);
    console.log(`  - MCPサーバー設定数: ${stats.configs}`);
    console.log(`  - MCPサーバーインスタンス数: ${stats.instances}`);
  } catch (error) {
    logError("移行中にエラーが発生しました:");
    console.error(error);
    process.exit(1);
  } finally {
    await backupDb.$disconnect();
    await productionDb.$disconnect();
  }
}

// 実行
migrateData().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
