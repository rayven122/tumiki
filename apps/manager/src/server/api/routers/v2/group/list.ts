import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { ListGroupsInput } from "../../../../utils/groupSchemas";
import type { KeycloakGroup } from "@tumiki/keycloak";

/**
 * グループ一覧取得
 *
 * セキュリティ：
 * - データベースで組織の存在を確認
 * - Keycloakから組織のサブグループ一覧を取得
 */
export const listGroups = async (
  db: PrismaTransactionClient,
  input: ListGroupsInput,
): Promise<KeycloakGroup[]> => {
  // データベースで組織の存在を確認
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, slug: true },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  }

  // Keycloakプロバイダーを初期化（環境変数から自動設定）
  let keycloakProvider: KeycloakOrganizationProvider;
  try {
    keycloakProvider = KeycloakOrganizationProvider.fromEnv();
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error ? error.message : "Keycloak設定が不完全です",
    });
  }

  // 組織グループ自体の情報を取得
  const orgGroupResult = await keycloakProvider.getGroup({
    groupId: organization.id,
  });

  if (!orgGroupResult.success || !orgGroupResult.group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: orgGroupResult.error ?? "組織グループが見つかりません",
    });
  }

  // 組織グループをルートノードとして返す（subGroupsはKeycloakが自動的に含めている）
  return [orgGroupResult.group];
};
