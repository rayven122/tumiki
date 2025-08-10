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
