import dagre from "dagre";
import type { DepartmentNodeType } from "@/features/org-structure/components/nodes/DepartmentNode";
import type { DepartmentEdgeType } from "@/features/org-structure/components/edges/DepartmentEdge";

/**
 * 孤立ノード（エッジが接続されていないノード）を検出
 *
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @returns 孤立ノードのIDセット
 */
const getIsolatedNodeIds = (
  nodes: DepartmentNodeType[],
  edges: DepartmentEdgeType[],
): Set<string> => {
  const connectedNodeIds = new Set<string>();

  // エッジに接続されているノードIDを収集
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  // 接続されていないノードIDを返す
  const isolatedNodeIds = new Set<string>();
  nodes.forEach((node) => {
    if (!connectedNodeIds.has(node.id)) {
      isolatedNodeIds.add(node.id);
    }
  });

  return isolatedNodeIds;
};

/**
 * dagreを使ったノードの自動レイアウト
 *
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @returns 位置が計算されたノード配列
 */
export const getLayoutedElements = (
  nodes: DepartmentNodeType[],
  edges: DepartmentEdgeType[],
): DepartmentNodeType[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // グラフの方向とスペーシング設定
  dagreGraph.setGraph({
    rankdir: "TB", // Top to Bottom（上から下）
    ranksep: 150, // 階層間のスペース（視認性向上）
    nodesep: 120, // ノード間のスペース（視認性向上）
  });

  // ノードをグラフに追加
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: 330, // ノードの幅（min-w-[320px]に余裕を持たせる）
      height: 280, // ノードの高さ（アイコン＋チーム名＋部署長＋メンバー数＋メンバーアイコン＋パディング）
    });
  });

  // エッジをグラフに追加
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // レイアウト計算
  dagre.layout(dagreGraph);

  // 孤立ノードを検出
  const isolatedNodeIds = getIsolatedNodeIds(nodes, edges);

  // 計算された位置をノードに適用（孤立ノードは元の位置を維持）
  return nodes.map((node) => {
    // 孤立ノードは元の位置を維持
    if (isolatedNodeIds.has(node.id)) {
      return node;
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 165, // ノード幅の半分を引いて中央揃え（330 / 2 = 165）
        y: nodeWithPosition.y - 140, // ノード高さの半分を引いて中央揃え（280 / 2 = 140）
      },
    };
  });
};
