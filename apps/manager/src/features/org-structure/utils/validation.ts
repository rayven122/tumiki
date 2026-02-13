import type { DepartmentNodeType } from "@/features/org-structure/components/nodes/DepartmentNode";
import type { DepartmentEdgeType } from "@/features/org-structure/components/edges/DepartmentEdge";

/**
 * 孤立部署（親部署のない部署）を検出する
 *
 * VR-3: 矢印なし部署チェック
 * 全ての部署（ルート除く）が親部署を持つ必要がある
 *
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @returns 孤立部署が存在する場合true
 */
export const detectOrphanedDepartments = (
  nodes: DepartmentNodeType[],
  edges: DepartmentEdgeType[],
): boolean => {
  // ルートノードを探す
  const rootNodeId = findRootNode(nodes);

  // 各ノードが親を持つかチェック
  return nodes.some((node) => {
    // ルートノードはスキップ
    if (node.id === rootNodeId) return false;

    // このノードに接続している親エッジがあるか確認
    const hasParent = edges.some((edge) => edge.target === node.id);

    // 親がない場合、孤立部署として検出
    return !hasParent;
  });
};

/**
 * ルートノード（最上位組織）を探す
 *
 * @param nodes - React Flowノード配列
 * @returns ルートノードのID
 */
const findRootNode = (nodes: DepartmentNodeType[]): string => {
  // isRootフラグを持つノードを探す
  const rootNode = nodes.find((node) => node.data.isRoot);
  if (rootNode) return rootNode.id;

  // フラグがない場合、最初のノードをルートとみなす
  return nodes[0]?.id ?? "";
};
