import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import type { GetGroupMembersInput, Member } from "@/server/utils/groupSchemas";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * ユーザー名からイニシャルを生成
 *
 * @param name - ユーザー名またはメールアドレス
 * @returns イニシャル（最大2文字）
 */
const generateInitials = (name: string): string => {
  if (!name) return "?";

  // メールアドレスの場合は@より前を使用
  const displayName = name.includes("@") ? name.split("@")[0] : name;

  if (!displayName) return "?";

  // スペースで分割して名前の各部分の最初の文字を取得
  const parts = displayName.trim().split(/\s+/);

  if (parts.length >= 2) {
    // 姓名がある場合は最初の2文字
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  // 1単語の場合は最初の1-2文字
  return displayName.slice(0, 2).toUpperCase();
};

/**
 * グループメンバー一覧取得
 *
 * セキュリティ：
 * - 操作対象の組織が現在のユーザーの所属組織であることを確認
 * - データベースで組織の存在を確認
 * - すべてのグループIDが組織のサブグループであることを確認
 * - 複数グループのメンバーを一括取得（パフォーマンス最適化）
 *
 * パフォーマンス最適化：
 * - メンバー詳細情報はDBから一括取得（Keycloak APIの呼び出しを削減）
 * - KeycloakからはグループメンバーシップのIDのみを取得
 *
 * @param db - Prisma transaction client
 * @param input - グループメンバー取得パラメータ
 * @param currentOrg - 現在のユーザーの所属組織情報
 * @returns グループIDをキーとしたメンバーマップ
 */
export const getGroupMembers = async (
  db: PrismaTransactionClient,
  input: GetGroupMembersInput,
  currentOrg: OrganizationInfo,
): Promise<Record<string, Member[]>> => {
  // セキュリティチェック: 組織IDが現在のコンテキストと一致するか
  if (currentOrg.id !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のグループメンバーにアクセスすることはできません",
    });
  }
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

  // 有効なgroupIdのみをフィルタリング（組織のサブグループ、または組織グループ自体）
  // 削除されたグループや無効なグループIDはスキップ
  const validGroupIds = input.groupIds.filter((groupId) => {
    // 組織グループ自体のIDは許可
    if (groupId === organization.id) return true;
    // サブグループの場合は検証
    return isValidGroup(groupsResult.subgroups, groupId);
  });

  // 組織の全メンバーをDBから取得（効率化）
  // 参加が古い順にソート（createdAt昇順）
  const organizationMembers = await db.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc", // 参加が古い順
    },
  });

  // ユーザーIDをキーとしたマップを作成
  const userMap = new Map<string, Member>(
    organizationMembers.map((om) => [
      om.userId,
      {
        id: om.userId,
        name: om.user.name ?? om.user.email ?? "名前未設定",
        initials: generateInitials(om.user.name ?? om.user.email ?? "?"),
        email: om.user.email ?? undefined,
        avatarUrl: om.user.image ?? undefined,
      },
    ]),
  );

  // 各グループのメンバーIDをKeycloakから取得
  const membersMap: Record<string, Member[]> = {};

  for (const groupId of validGroupIds) {
    const result = await keycloakProvider.listGroupMembers({ groupId });

    if (result.success && result.members) {
      // KeycloakのユーザーIDとDBのユーザーをマッピング
      const members: Member[] = [];
      for (const keycloakUser of result.members) {
        const userId = keycloakUser.id;
        if (!userId) continue;

        // DBから取得したユーザー情報を使用
        const member = userMap.get(userId);
        if (member) {
          members.push(member);
        }
      }

      // 参加が古い順にソート（organizationMembersの順序を使用）
      members.sort((a, b) => {
        const aIndex = organizationMembers.findIndex(
          (om) => om.userId === a.id,
        );
        const bIndex = organizationMembers.findIndex(
          (om) => om.userId === b.id,
        );
        return aIndex - bIndex;
      });

      membersMap[groupId] = members;
    } else {
      // エラー時は空配列を設定（部分的な失敗を許容）
      membersMap[groupId] = [];
    }
  }

  return membersMap;
};
