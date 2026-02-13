import type { OrgData } from "@/features/org-structure/utils/mock/mockOrgData";
import type { DepartmentNodeType } from "@/features/org-structure/components/nodes/DepartmentNode";
import type { DepartmentEdgeType } from "@/features/org-structure/components/edges/DepartmentEdge";
// DepartmentIdは削除されたため、stringを使用

/**
 * 指定された部署の子部署IDを取得する
 *
 * @param departmentId - 部署ID
 * @param orgData - 組織構造データ
 * @returns 子部署IDの配列
 */
const getChildDepartmentIds = (
  departmentId: string,
  orgData: OrgData,
): string[] => {
  return orgData.relations
    .filter((rel) => rel.parentId === departmentId)
    .map((rel) => rel.childId);
};

/**
 * 指定された部署の合計メンバー数を計算する（子部署を含む）
 *
 * @param departmentId - 部署ID
 * @param orgData - 組織構造データ
 * @returns 合計メンバー数
 */
const calculateTotalMemberCount = (
  departmentId: string,
  orgData: OrgData,
): number => {
  // 現在の部署のメンバー数
  const currentDepartment = orgData.departments.find(
    (dept) => dept.id === departmentId,
  );
  if (!currentDepartment) return 0;

  let totalCount = currentDepartment.memberCount;

  // 子部署のメンバー数を再帰的に加算
  const childIds = getChildDepartmentIds(departmentId, orgData);
  for (const childId of childIds) {
    totalCount += calculateTotalMemberCount(childId, orgData);
  }

  return totalCount;
};

/**
 * 組織データをReact Flow形式（nodes, edges）に変換する
 *
 * @param orgData - 組織構造データ
 * @returns React Flow用のnodesとedges
 */
export const convertOrgDataToFlow = (
  orgData: OrgData,
): { nodes: DepartmentNodeType[]; edges: DepartmentEdgeType[] } => {
  // 部署データをReact Flowノードに変換
  const nodes: DepartmentNodeType[] = orgData.departments.map((dept) => {
    const totalMemberCount = calculateTotalMemberCount(dept.id, orgData);

    return {
      id: dept.id,
      type: "department", // カスタムノードタイプ
      position: { x: 0, y: 0 }, // 初期位置（レイアウト関数で上書きされる）
      data: {
        name: dept.name,
        icon: dept.icon,
        color: dept.color,
        leader: dept.leader,
        members: dept.members,
        memberCount: dept.memberCount,
        totalMemberCount, // 子部署を含む合計メンバー数
        roles: dept.roles, // 割り当てられたロール一覧
        isRoot: dept.isRoot,
      },
    };
  });

  // 部署間の関係をReact Flowエッジに変換
  const edges: DepartmentEdgeType[] = orgData.relations.map((rel, index) => ({
    id: `e-${index}`,
    source: rel.parentId,
    target: rel.childId,
    sourceHandle: "source",
    targetHandle: "target",
    type: "department", // カスタムエッジタイプ
  }));

  return { nodes, edges };
};
