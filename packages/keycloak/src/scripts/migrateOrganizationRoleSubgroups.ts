/**
 * 既存組織にロールサブグループを追加するマイグレーションスクリプト
 *
 * 実行方法:
 * 1. 環境変数を設定 (KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_USERNAME, KEYCLOAK_ADMIN_PASSWORD, DATABASE_URL)
 * 2. pnpm tsx packages/keycloak/src/scripts/migrateOrganizationRoleSubgroups.ts
 *
 * このスクリプトは以下を実行します:
 * - チーム組織（isPersonal=false）を取得
 * - 各組織のKeycloakグループにロールサブグループ（_Owner, _Admin, _Member, _Viewer）を作成
 * - 各サブグループにRealm Roleをマッピング
 * - 既存の組織メンバーを_Memberサブグループに移動（ロール情報がないため）
 *   ※ 移行後、管理者が各メンバーのロールを調整する必要があります
 *
 * 注意:
 * - 個人組織（isPersonal=true）はスキップされます
 * - 既にロールサブグループが存在する組織もスキップされます
 * - dry-run モードで実行可能（DRY_RUN=true）
 */

import { db } from "@tumiki/db/server";

import type { OrganizationRole } from "../types.js";
import { KeycloakAdminClient } from "../client.js";
import { createRoleSubgroups, getRoleSubgroupId } from "../providerServices.js";

// 環境変数の取得
const getEnvOrThrow = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
};

// ドライランモード
const DRY_RUN = process.env.DRY_RUN === "true";

// ロールサブグループ名のプレフィックス
const ROLE_SUBGROUP_PREFIX = "_";

// デフォルトの移行先ロール（既存メンバー用）
const DEFAULT_MIGRATION_ROLE: OrganizationRole = "Member";

type MigrationResult = {
  organizationId: string;
  slug: string;
  status: "skipped" | "migrated" | "error";
  message: string;
  membersAffected?: number;
};

const main = async (): Promise<void> => {
  console.log("=== 組織ロールサブグループマイグレーション ===");
  console.log(`モード: ${DRY_RUN ? "ドライラン（変更なし）" : "実行"}`);
  console.log("");

  // Prismaクライアントは@tumiki/db/serverからインポート済み

  // Keycloakクライアント初期化
  const keycloakClient = new KeycloakAdminClient({
    baseUrl: getEnvOrThrow("KEYCLOAK_URL"),
    realm: getEnvOrThrow("KEYCLOAK_REALM"),
    adminUsername: getEnvOrThrow("KEYCLOAK_ADMIN_USERNAME"),
    adminPassword: getEnvOrThrow("KEYCLOAK_ADMIN_PASSWORD"),
  });

  const results: MigrationResult[] = [];

  try {
    // 1. チーム組織（isPersonal=false）を取得
    const teamOrganizations = await db.organization.findMany({
      where: {
        isPersonal: false,
        isDeleted: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    console.log(`チーム組織数: ${teamOrganizations.length}`);
    console.log("");

    // 2. 各組織を処理
    for (const org of teamOrganizations) {
      console.log(`処理中: ${org.name} (${org.slug})`);

      try {
        // ロールサブグループが既に存在するか確認
        const subgroups = await keycloakClient.listSubgroups(org.id);
        const hasRoleSubgroups = subgroups.some((sg) =>
          sg.name?.startsWith(ROLE_SUBGROUP_PREFIX),
        );

        if (hasRoleSubgroups) {
          console.log(`  → スキップ: ロールサブグループが既に存在します`);
          results.push({
            organizationId: org.id,
            slug: org.slug,
            status: "skipped",
            message: "ロールサブグループが既に存在します",
          });
          continue;
        }

        if (DRY_RUN) {
          console.log(`  → ドライラン: ロールサブグループを作成予定`);
          console.log(
            `  → ドライラン: ${org.members.length}人のメンバーを_Memberに移動予定`,
          );
          results.push({
            organizationId: org.id,
            slug: org.slug,
            status: "migrated",
            message: "ドライラン - 変更なし",
            membersAffected: org.members.length,
          });
          continue;
        }

        // 3. ロールサブグループを作成
        console.log(`  → ロールサブグループを作成中...`);
        await createRoleSubgroups(keycloakClient, org.id);

        // 4. 既存メンバーをデフォルトロール（Member）のサブグループに移動
        const memberSubgroupId = await getRoleSubgroupId(
          keycloakClient,
          org.id,
          DEFAULT_MIGRATION_ROLE,
        );

        console.log(
          `  → ${org.members.length}人のメンバーを_Memberに移動中...`,
        );
        for (const member of org.members) {
          await keycloakClient.addUserToGroup(member.userId, memberSubgroupId);
        }

        console.log(`  → 完了`);
        results.push({
          organizationId: org.id,
          slug: org.slug,
          status: "migrated",
          message: "ロールサブグループを作成し、メンバーを移動しました",
          membersAffected: org.members.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "不明なエラー";
        console.error(`  → エラー: ${errorMessage}`);
        results.push({
          organizationId: org.id,
          slug: org.slug,
          status: "error",
          message: errorMessage,
        });
      }

      console.log("");
    }

    // 結果サマリー
    console.log("=== マイグレーション結果サマリー ===");
    const migrated = results.filter((r) => r.status === "migrated");
    const skipped = results.filter((r) => r.status === "skipped");
    const errors = results.filter((r) => r.status === "error");

    console.log(`マイグレーション成功: ${migrated.length}`);
    console.log(`スキップ: ${skipped.length}`);
    console.log(`エラー: ${errors.length}`);

    if (errors.length > 0) {
      console.log("");
      console.log("エラーが発生した組織:");
      for (const error of errors) {
        console.log(`  - ${error.slug}: ${error.message}`);
      }
    }

    if (migrated.length > 0 && !DRY_RUN) {
      console.log("");
      console.log(
        "⚠️ 注意: 既存メンバーは全て「Member」ロールに設定されています。",
      );
      console.log(
        "   管理者がロールを調整する必要がある場合は、管理画面から変更してください。",
      );
    }
  } finally {
    // dbは@tumiki/db/serverからインポートされたシングルトンなので、$disconnectは不要
  }
};

main().catch((error) => {
  console.error("マイグレーション中に致命的なエラーが発生しました:", error);
  process.exit(1);
});
