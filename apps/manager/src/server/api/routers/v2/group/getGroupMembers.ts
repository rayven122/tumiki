import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type {
  GetGroupMembersInput,
  Member,
} from "../../../../utils/groupSchemas";

/**
 * グループメンバー一覧取得
 *
 * セキュリティ：
 * - データベースで組織の存在を確認
 * - すべてのグループIDが組織のサブグループであることを確認
 * - 複数グループのメンバーを一括取得（パフォーマンス最適化）
 *
 * @param db - Prisma transaction client
 * @param input - グループメンバー取得パラメータ
 * @returns グループIDをキーとしたメンバーマップ
 */
export const getGroupMembers = async (
  db: PrismaTransactionClient,
  input: GetGroupMembersInput,
): Promise<Record<string, Member[]>> => {
  // データベースで組織の存在を確認
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
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

  // 組織のサブグループ一覧を取得してすべてのgroupIdを検証
  const groupsResult = await keycloakProvider.listSubgroups({
    organizationId: organization.id,
  });

  if (!groupsResult.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "グループの検証に失敗しました",
    });
  }

  // 再帰的にすべてのサブグループをチェック
  const isValidGroup = (
    groups: Array<{ id?: string; subGroups?: unknown[] }> | undefined,
    targetId: string,
  ): boolean => {
    if (!groups) return false;
    for (const group of groups) {
      if (group.id === targetId) return true;
      if (
        Array.isArray(group.subGroups) &&
        isValidGroup(
          group.subGroups as Array<{ id?: string; subGroups?: unknown[] }>,
          targetId,
        )
      ) {
        return true;
      }
    }
    return false;
  };

  // すべてのgroupIdが組織のサブグループであることを確認
  for (const groupId of input.groupIds) {
    if (!isValidGroup(groupsResult.subgroups, groupId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "指定されたグループの中に、この組織に属していないものがあります",
      });
    }
  }

  // 各グループのメンバーを取得
  const membersMap: Record<string, Member[]> = {};

  for (const groupId of input.groupIds) {
    const result = await keycloakProvider.listGroupMembers({ groupId });

    if (result.success && result.members) {
      membersMap[groupId] = result.members.map((user) => {
        // 名前の構築
        const firstName = user.firstName ?? "";
        const lastName = user.lastName ?? "";
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = fullName || user.email || "名前未設定";

        // イニシャルの生成
        const initials =
          firstName && lastName
            ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
            : displayName.charAt(0).toUpperCase();

        return {
          id: user.id ?? "",
          name: displayName,
          email: user.email,
          avatarUrl: user.attributes?.avatarUrl?.[0],
          initials,
        };
      });
    } else {
      // エラー時は空配列を設定（部分的な失敗を許容）
      membersMap[groupId] = [];
    }
  }

  return membersMap;
};
