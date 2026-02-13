import type { GroupOutput } from "@/server/utils/groupSchemas";
import type {
  OrgData,
  Department,
  DepartmentRelation,
  Member,
  Role,
} from "@/features/org-structure/utils/mock/mockOrgData";

type ConversionOptions = {
  membersMap?: Record<string, Member[]>; // グループIDをキーとしたメンバーマップ
  rolesMap?: Record<string, Role[]>; // グループIDをキーとしたロールマップ
  defaultIcon?: string;
  defaultColor?: string;
};

/**
 * KeycloakグループをOrgData形式に変換
 *
 * @param groups - Keycloak グループの配列（tRPCのGroupOutput型）
 * @param options - 変換オプション
 * @returns OrgData形式のデータ
 */
export const keycloakGroupsToOrgData = (
  groups: GroupOutput[],
  options: ConversionOptions = {},
): OrgData => {
  const {
    membersMap = {},
    rolesMap = {},
    defaultIcon = "Building2",
    defaultColor = "#6366f1",
  } = options;

  const departments: Department[] = [];
  const relations: DepartmentRelation[] = [];

  /**
   * 再帰的にグループを処理
   */
  const processGroup = (
    group: GroupOutput,
    parentId: string | null,
    isRoot = false,
  ): void => {
    if (!group.id || !group.name) return;

    // attributes から icon, color, leaderId を取得
    const icon = group.attributes?.icon?.[0] ?? defaultIcon;
    const color = group.attributes?.color?.[0] ?? defaultColor;
    const leaderId = group.attributes?.leaderId?.[0];

    // メンバー情報を取得
    const members = membersMap[group.id] ?? [];

    // ロール情報を取得
    const roles = rolesMap[group.id] ?? [];

    // リーダーの決定
    let leader: Member | undefined;
    if (isRoot) {
      // ルートノードの場合、最初のメンバー（参加が古い順 = owner）をリーダーとする
      leader = members[0];
    } else {
      // 通常のノードの場合、leaderIdがあればそれを使用、なければ最初のメンバー
      leader = leaderId
        ? (members.find((m) => m.id === leaderId) ?? members[0])
        : members[0];
    }

    departments.push({
      id: group.id,
      name: group.name,
      icon: icon,
      color,
      leader: leader ?? {
        id: "",
        name: "未設定",
        initials: "?",
      },
      members,
      memberCount: members.length,
      roles,
      isRoot,
    });

    // 親子関係を追加
    if (parentId) {
      relations.push({
        parentId,
        childId: group.id,
      });
    }

    // subGroups を再帰的に処理
    if (group.subGroups && Array.isArray(group.subGroups)) {
      for (const subGroup of group.subGroups) {
        processGroup(subGroup, group.id, false);
      }
    }
  };

  // ルートグループから処理開始（組織グループがルートノードとして含まれる）
  for (const group of groups) {
    processGroup(group, null, true);
  }

  return { departments, relations };
};

/**
 * 全グループIDを再帰的に抽出
 *
 * @param groups - Keycloak グループの配列（tRPCのGroupOutput型）
 * @returns グループIDの配列
 */
export const extractAllGroupIds = (groups: GroupOutput[]): string[] => {
  const ids: string[] = [];

  const traverse = (group: GroupOutput): void => {
    if (group.id) ids.push(group.id);
    if (group.subGroups && Array.isArray(group.subGroups)) {
      for (const sub of group.subGroups) {
        traverse(sub);
      }
    }
  };

  for (const group of groups) {
    traverse(group);
  }

  return ids;
};
