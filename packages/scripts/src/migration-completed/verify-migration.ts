#!/usr/bin/env tsx
/**
 * 移行検証スクリプト
 * オフライン移行後のデータ整合性を確認
 *
 * 実行方法:
 * pnpm tsx packages/scripts/src/migration-completed/verify-migration.ts
 */
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// 環境変数を読み込む
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// 色付きログ出力
const logSuccess = (message: string) => console.log(`✅ ${message}`);
const logError = (message: string) => console.error(`❌ ${message}`);
const logWarning = (message: string) => console.log(`⚠️  ${message}`);
const logInfo = (message: string) => console.log(`ℹ️  ${message}`);

/**
 * 検証結果の型定義
 */
type VerificationResult = {
  passed: boolean;
  message: string;
  details?: any;
};

/**
 * ユーザーと組織の関係を検証
 */
async function verifyUserOrganizationRelations(): Promise<VerificationResult> {
  const usersWithoutOrg = await prisma.user.findMany({
    where: {
      members: {
        none: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (usersWithoutOrg.length > 0) {
    return {
      passed: false,
      message: `${usersWithoutOrg.length} 人のユーザーが組織に所属していません`,
      details: usersWithoutOrg,
    };
  }

  const totalUsers = await prisma.user.count();
  const usersWithPersonalOrg = await prisma.user.count({
    where: {
      members: {
        some: {
          organization: {
            isPersonal: true,
          },
        },
      },
    },
  });

  // defaultOrganizationId の検証を追加
  const usersWithDefaultOrg = await prisma.user.count({
    where: {
      defaultOrganizationId: {
        not: null,
      },
    },
  });

  const issues: string[] = [];
  if (usersWithDefaultOrg < totalUsers) {
    issues.push(
      `${totalUsers - usersWithDefaultOrg} 人のユーザーが defaultOrganizationId を持っていません`,
    );
  }

  if (issues.length > 0) {
    return {
      passed: false,
      message: `ユーザーと組織の関係に問題があります`,
      details: issues,
    };
  }

  return {
    passed: true,
    message: `全ユーザー (${totalUsers}人) が組織に所属し、defaultOrganizationId を持っています (個人組織: ${usersWithPersonalOrg}人)`,
  };
}

/**
 * organizationIdの設定状況を検証
 */
async function verifyOrganizationIds(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // UserMcpServerConfig - organizationId は必須になった
  const totalConfigs = await prisma.userMcpServerConfig.count();
  const configsWithOrgId = await prisma.userMcpServerConfig.count({
    where: {
      organizationId: {
        not: null,
      },
    },
  });

  results.push({
    passed: configsWithOrgId === totalConfigs,
    message: `UserMcpServerConfig: ${totalConfigs} 件すべてが organizationId を持っています`,
  });

  // UserToolGroup - organizationId は必須になった
  const totalGroups = await prisma.userToolGroup.count();
  const groupsWithOrgId = await prisma.userToolGroup.count({
    where: {
      organizationId: {
        not: null,
      },
    },
  });

  results.push({
    passed: groupsWithOrgId === totalGroups,
    message: `UserToolGroup: ${totalGroups} 件すべてが organizationId を持っています`,
  });

  // UserMcpServerInstance - organizationId は必須になった
  const totalInstances = await prisma.userMcpServerInstance.count();
  const instancesWithOrgId = await prisma.userMcpServerInstance.count({
    where: {
      organizationId: {
        not: null,
      },
    },
  });

  results.push({
    passed: instancesWithOrgId === totalInstances,
    message: `UserMcpServerInstance: ${totalInstances} 件すべてが organizationId を持っています`,
  });

  // McpServerRequestLog - organizationId は必須になった
  const totalLogs = await prisma.mcpServerRequestLog.count();
  const logsWithOrgId = await prisma.mcpServerRequestLog.count({
    where: {
      organizationId: {
        not: null,
      },
    },
  });

  results.push({
    passed: logsWithOrgId === totalLogs || totalLogs === 0,
    message: `McpServerRequestLog: ${totalLogs} 件中 ${logsWithOrgId} 件が organizationId を持っています`,
  });

  return results;
}

/**
 * 個人組織の設定を検証
 */
async function verifyPersonalOrganizations(): Promise<VerificationResult> {
  const personalOrgs = await prisma.organization.findMany({
    where: {
      isPersonal: true,
    },
    include: {
      members: true,
    },
  });

  const issues: string[] = [];

  for (const org of personalOrgs) {
    // 個人組織は必ず1人のメンバー
    if (org.members.length !== 1) {
      issues.push(
        `組織 ${org.name} (${org.id}) のメンバー数が異常です: ${org.members.length}人`,
      );
    }

    // maxMembersは1であるべき
    if (org.maxMembers !== 1) {
      issues.push(
        `組織 ${org.name} (${org.id}) の maxMembers が異常です: ${org.maxMembers}`,
      );
    }

    // isPersonalがtrueであるべき
    if (!org.isPersonal) {
      issues.push(`組織 ${org.name} (${org.id}) の isPersonal が false です`);
    }
  }

  if (issues.length > 0) {
    return {
      passed: false,
      message: `個人組織の設定に ${issues.length} 件の問題があります`,
      details: issues,
    };
  }

  return {
    passed: true,
    message: `${personalOrgs.length} 件の個人組織が正しく設定されています`,
  };
}

/**
 * APIキーの検証
 */
async function verifyApiKeys(): Promise<VerificationResult> {
  const apiKeys = await prisma.mcpApiKey.findMany({
    select: {
      id: true,
      userMcpServerInstanceId: true,
    },
  });

  const issues: string[] = [];

  // すべてのAPIキーがuserMcpServerInstanceIdを持つことを確認
  const keysWithoutInstance = apiKeys.filter(
    (key) => !key.userMcpServerInstanceId,
  );

  if (keysWithoutInstance.length > 0) {
    issues.push(
      `${keysWithoutInstance.length} 件のAPIキーが userMcpServerInstanceId を持っていません`,
    );
  }

  if (issues.length > 0) {
    return {
      passed: false,
      message: `APIキーの設定に ${issues.length} 件の問題があります`,
      details: issues,
    };
  }

  return {
    passed: true,
    message: `${apiKeys.length} 件のAPIキーが正しく設定されています`,
  };
}

/**
 * データ件数の整合性を検証
 */
async function verifyDataCounts(): Promise<VerificationResult> {
  const counts = {
    users: await prisma.user.count(),
    organizations: await prisma.organization.count(),
    personalOrgs: await prisma.organization.count({
      where: { isPersonal: true },
    }),
    members: await prisma.organizationMember.count(),
    configs: await prisma.userMcpServerConfig.count(),
    toolGroups: await prisma.userToolGroup.count(),
    instances: await prisma.userMcpServerInstance.count(),
    mcpServers: await prisma.mcpServer.count(),
    apiKeys: await prisma.mcpApiKey.count(),
  };

  // 基本的な整合性チェック
  const issues: string[] = [];

  if (counts.users === 0) {
    issues.push("ユーザーが存在しません");
  }

  if (counts.organizations === 0) {
    issues.push("組織が存在しません");
  }

  if (counts.members < counts.users) {
    issues.push(
      `組織メンバー数 (${counts.members}) がユーザー数 (${counts.users}) より少ない`,
    );
  }

  if (issues.length > 0) {
    return {
      passed: false,
      message: "データ件数に問題があります",
      details: { counts, issues },
    };
  }

  return {
    passed: true,
    message: "データ件数は正常です",
    details: counts,
  };
}

/**
 * メイン検証処理
 */
async function main() {
  console.log("🔍 移行結果の検証を開始します...\n");

  let allPassed = true;
  const results: { [key: string]: VerificationResult | VerificationResult[] } =
    {};

  // 1. ユーザーと組織の関係
  console.log("📋 ユーザーと組織の関係を検証中...");
  const userOrgResult = await verifyUserOrganizationRelations();
  results["ユーザー組織関係"] = userOrgResult;
  if (userOrgResult.passed) {
    logSuccess(userOrgResult.message);
  } else {
    logError(userOrgResult.message);
    if (userOrgResult.details) {
      console.log("  詳細:", userOrgResult.details);
    }
    allPassed = false;
  }

  // 2. organizationIdの設定状況
  console.log("\n📋 organizationId の設定状況を検証中...");
  const orgIdResults = await verifyOrganizationIds();
  results["organizationId設定"] = orgIdResults;
  for (const result of orgIdResults) {
    if (result.passed) {
      logSuccess(result.message);
    } else {
      logWarning(result.message);
      // organizationIdの未設定は警告レベル（古いデータの可能性）
    }
  }

  // 3. 個人組織の設定
  console.log("\n📋 個人組織の設定を検証中...");
  const personalOrgResult = await verifyPersonalOrganizations();
  results["個人組織設定"] = personalOrgResult;
  if (personalOrgResult.passed) {
    logSuccess(personalOrgResult.message);
  } else {
    logError(personalOrgResult.message);
    if (personalOrgResult.details) {
      console.log("  詳細:", personalOrgResult.details);
    }
    allPassed = false;
  }

  // 4. APIキーの検証
  console.log("\n📋 APIキーの設定を検証中...");
  const apiKeyResult = await verifyApiKeys();
  results["APIキー設定"] = apiKeyResult;
  if (apiKeyResult.passed) {
    logSuccess(apiKeyResult.message);
  } else {
    logError(apiKeyResult.message);
    if (apiKeyResult.details) {
      console.log("  詳細:", apiKeyResult.details);
    }
    allPassed = false;
  }

  // 5. データ件数の整合性
  console.log("\n📋 データ件数の整合性を検証中...");
  const countResult = await verifyDataCounts();
  results["データ件数"] = countResult;
  if (countResult.passed) {
    logSuccess(countResult.message);
    console.log("\n📊 データ統計:");
    const counts = countResult.details;
    console.log(`  - ユーザー数: ${counts.users}`);
    console.log(`  - 組織数: ${counts.organizations}`);
    console.log(`  - 個人組織数: ${counts.personalOrgs}`);
    console.log(`  - 組織メンバー数: ${counts.members}`);
    console.log(`  - MCPサーバー設定数: ${counts.configs}`);
    console.log(`  - ツールグループ数: ${counts.toolGroups}`);
    console.log(`  - MCPサーバーインスタンス数: ${counts.instances}`);
    console.log(`  - MCPサーバー定義数: ${counts.mcpServers}`);
    console.log(`  - APIキー数: ${counts.apiKeys}`);
  } else {
    logError(countResult.message);
    if (countResult.details) {
      console.log("  詳細:", countResult.details);
    }
    allPassed = false;
  }

  // 最終結果
  console.log("\n" + "=".repeat(50));
  if (allPassed) {
    logSuccess("🎉 移行検証が完了しました。全ての項目が正常です！");
    process.exit(0);
  } else {
    logError("移行検証で問題が検出されました。詳細を確認してください。");
    process.exit(1);
  }
}

// 実行
main()
  .catch((error) => {
    logError("検証中にエラーが発生しました:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
