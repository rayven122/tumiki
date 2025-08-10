#!/usr/bin/env tsx
/**
 * オフライン移行スクリプト
 * バックアップDBから新しいスキーマの本番DBへデータを移行
 *
 * 実行方法:
 * BACKUP_DATABASE_URL=postgresql://... DATABASE_URL=postgresql://... \
 * pnpm tsx packages/scripts/src/migration-completed/offline-migration.ts
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
    const users = await backupDb.user.findMany();
    for (const user of users) {
      await productionDb.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          // hasCompletedOnboarding フィールドは削除されたため除外
          // defaultOrganizationId は後で設定
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    }
    logSuccess(`${users.length} 件のユーザーを移行しました`);

    // 2. 既存の組織データの移行
    logProgress("既存の組織データを移行中...");
    const organizations = await backupDb.organization.findMany();
    for (const org of organizations) {
      await productionDb.organization.create({
        data: {
          id: org.id,
          name: org.name,
          description: org.description,
          logoUrl: org.logoUrl,
          isDeleted: org.isDeleted,
          // mainブランチではデフォルト値が変更されている
          isPersonal: org.isPersonal ?? true,
          maxMembers: org.maxMembers ?? 1,
          createdBy: org.createdBy,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        },
      });
    }
    logSuccess(`${organizations.length} 件の組織を移行しました`);

    // 3. 組織メンバーの移行
    logProgress("組織メンバーデータを移行中...");
    const members = await backupDb.organizationMember.findMany();
    for (const member of members) {
      await productionDb.organizationMember.create({
        data: member as any,
      });
    }
    logSuccess(`${members.length} 件の組織メンバーを移行しました`);

    // ========================================
    // Phase 2: 個人組織の作成
    // ========================================
    logProgress("Phase 2: 個人組織の作成", "2️⃣");

    // 組織を持たないユーザーを検索
    const usersWithoutOrg = await productionDb.user.findMany({
      where: {
        members: {
          none: {},
        },
      },
    });

    logInfo(`${usersWithoutOrg.length} 人のユーザーに個人組織を作成します`);

    const orgIdMap = new Map<string, string>(); // userId -> organizationId

    for (const user of usersWithoutOrg) {
      const personalOrg = await productionDb.organization.create({
        data: {
          name: `${user.name || user.email || "User"}'s Workspace`,
          description: "Personal workspace",
          isPersonal: true,
          maxMembers: 1,
          createdBy: user.id,
        },
      });

      await productionDb.organizationMember.create({
        data: {
          organizationId: personalOrg.id,
          userId: user.id,
          isAdmin: true,
        },
      });

      // defaultOrganizationId を設定（新スキーマで追加されたフィールド）
      await productionDb.user.update({
        where: { id: user.id },
        data: { defaultOrganizationId: personalOrg.id },
      });

      orgIdMap.set(user.id, personalOrg.id);
      logSuccess(`ユーザー ${user.email || user.id} の個人組織を作成しました`);
    }

    // ========================================
    // Phase 3: MCPサーバー関連データの移行
    // ========================================
    logProgress("Phase 3: MCPサーバー関連データの移行", "3️⃣");

    // 1. MCPサーバー定義の移行
    logProgress("MCPサーバー定義を移行中...");
    const mcpServers = await backupDb.mcpServer.findMany();
    for (const server of mcpServers) {
      await productionDb.mcpServer.create({
        data: server as any,
      });
    }
    logSuccess(`${mcpServers.length} 件のMCPサーバー定義を移行しました`);

    // 2. UserMcpServerConfigの移行（organizationId設定）
    logProgress("MCPサーバー設定を移行中...");
    const configs = await backupDb.userMcpServerConfig.findMany();
    let configMigrated = 0;
    let configSkipped = 0;

    for (const config of configs) {
      // userId フィールドが削除されたため、organizationId を特定
      const userId = (config as any).userId;
      const organizationId =
        (config as any).organizationId || orgIdMap.get(userId);

      if (!organizationId) {
        logError(
          `UserMcpServerConfig (ID: ${config.id}) の organizationId が特定できません`,
        );
        configSkipped++;
        continue;
      }

      // userId と oauthScopes, tools を除外してマイグレーション
      const { userId: _, oauthScopes, tools, ...configData } = config as any;

      await productionDb.userMcpServerConfig.create({
        data: {
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
    const toolGroups = await backupDb.userToolGroup.findMany();
    let toolGroupMigrated = 0;
    let toolGroupSkipped = 0;

    for (const group of toolGroups) {
      // userId フィールドが削除されたため、organizationId を特定
      const userId = (group as any).userId;
      const organizationId =
        (group as any).organizationId || orgIdMap.get(userId);

      if (!organizationId) {
        logError(
          `UserToolGroup (ID: ${group.id}) の organizationId が特定できません`,
        );
        toolGroupSkipped++;
        continue;
      }

      // userId を除外してマイグレーション
      const { userId: _, ...groupData } = group as any;

      await productionDb.userToolGroup.create({
        data: {
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
    const instances = await backupDb.userMcpServerInstance.findMany();
    let instanceMigrated = 0;
    let instanceSkipped = 0;

    for (const instance of instances) {
      // userId フィールドが削除されたため、organizationId を特定
      const userId = (instance as any).userId;
      const organizationId =
        (instance as any).organizationId || orgIdMap.get(userId);

      if (!organizationId) {
        logError(
          `UserMcpServerInstance (ID: ${instance.id}) の organizationId が特定できません`,
        );
        instanceSkipped++;
        continue;
      }

      // userId を除外してマイグレーション
      const { userId: _, ...instanceData } = instance as any;

      await productionDb.userMcpServerInstance.create({
        data: {
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
    const logs = await backupDb.mcpServerRequestLog.findMany({
      take: 10000, // 大量データの場合は分割処理
    });
    let logMigrated = 0;
    let logSkipped = 0;

    for (const log of logs) {
      // userIdからorganizationIdを特定
      const userId = (log as any).userId;
      let organizationId = (log as any).organizationId;

      if (!organizationId && userId) {
        organizationId = orgIdMap.get(userId);
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

    // ========================================
    // Phase 4: その他のデータ移行
    // ========================================
    logProgress("Phase 4: その他のデータ移行", "4️⃣");

    // 1. McpApiKeyの移行（userIdフィールドが削除されたため、関連するインスタンスから特定）
    logProgress("APIキーを移行中...");
    const apiKeys = await backupDb.mcpApiKey.findMany();
    let apiKeyMigrated = 0;
    let apiKeySkipped = 0;

    for (const apiKey of apiKeys) {
      // userId フィールドを除外してマイグレーション
      const { userId, ...apiKeyData } = apiKey as any;

      try {
        await productionDb.mcpApiKey.create({
          data: apiKeyData,
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

    // チャット、ドキュメントなど必要に応じて追加
    // ...

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
