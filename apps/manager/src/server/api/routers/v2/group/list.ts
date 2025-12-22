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

  // Keycloakプロバイダーを初期化
  const keycloakProvider = new KeycloakOrganizationProvider({
    baseUrl: process.env.KEYCLOAK_URL ?? "",
    realm: process.env.KEYCLOAK_REALM ?? "tumiki",
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? "",
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "",
  });

  // 組織のサブグループ一覧を取得
  const result = await keycloakProvider.listSubgroups({
    organizationId: organization.id,
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error ?? "グループ一覧の取得に失敗しました",
    });
  }

  return result.subgroups ?? [];
};
