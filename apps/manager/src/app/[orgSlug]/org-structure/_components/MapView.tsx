"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import {
  DepartmentNode,
  type DepartmentNodeType,
} from "./nodes/DepartmentNode";
import {
  DepartmentEdge,
  type DepartmentEdgeType,
} from "./edges/DepartmentEdge";
import { getLayoutedElements } from "./utils/layoutNodes";
import { convertOrgDataToFlow } from "./utils/orgDataConverter";
import type { OrgData } from "./mock/mockOrgData";

// カスタムノードとエッジの型定義
const nodeTypes = { department: DepartmentNode };
const edgeTypes = { department: DepartmentEdge };

type MapViewProps = {
  orgData: OrgData;
  onNodesChange: (nodes: DepartmentNodeType[]) => void;
  onEdgesChange: (edges: DepartmentEdgeType[]) => void;
  onArrangeNodesRef: React.MutableRefObject<(() => void) | null>;
};

/**
 * 組織図のマップビューコンポーネント
 *
 * 主要機能:
 * 1. React Flowセットアップ
 * 2. エッジ作成（選択状態チェック）
 * 3. エッジ削除（選択状態チェック）
 * 4. ノード選択管理
 */
export const MapView = ({
  orgData,
  onNodesChange,
  onEdgesChange,
  onArrangeNodesRef,
}: MapViewProps) => {
  const [nodes, setNodes, onNodesChangeInternal] =
    useNodesState<DepartmentNodeType>([]);
  const [edges, setEdges, onEdgesChangeInternal] =
    useEdgesState<DepartmentEdgeType>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // レイアウト調整関数
  const arrangeNodes = useCallback(() => {
    const layoutedNodes = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    toast.success("レイアウトを調整しました");
  }, [nodes, edges, setNodes]);

  // レイアウト調整関数をrefに設定
  useEffect(() => {
    onArrangeNodesRef.current = arrangeNodes;
  }, [arrangeNodes, onArrangeNodesRef]);

  // 初期データ変換とレイアウト
  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = convertOrgDataToFlow(orgData);
    const layoutedNodes = getLayoutedElements(rawNodes, rawEdges);
    setNodes(layoutedNodes);
    setEdges(rawEdges);
  }, [orgData, setNodes, setEdges]);

  // ノードとエッジの変更を親に通知
  useEffect(() => {
    onNodesChange(nodes);
  }, [nodes, onNodesChange]);

  useEffect(() => {
    onEdgesChange(edges);
  }, [edges, onEdgesChange]);

  // エッジに選択状態を反映
  const edgesWithSelection = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        isRelatedToSelected: selectedNodeId
          ? edge.source === selectedNodeId || edge.target === selectedNodeId
          : undefined,
        onDelete: (edgeId: string) => {
          setEdges((eds) => eds.filter((e) => e.id !== edgeId));
          toast.success("エッジを削除しました");
        },
      },
    }));
  }, [edges, selectedNodeId, setEdges]);

  /**
   * FR-1.2: エッジ作成（選択状態チェック）
   */
  const onConnect = useCallback(
    (params: Connection) => {
      // VR-2: 選択状態チェック
      if (
        !selectedNodeId ||
        (params.source !== selectedNodeId && params.target !== selectedNodeId)
      ) {
        toast.error("選択されたノードに関連する接続のみ可能です");
        return;
      }

      // VR-1: ルートノード保護
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      if (sourceNode?.data.isRoot || targetNode?.data.isRoot) {
        return; // エラー表示なし（要件通り）
      }

      setEdges((eds) => addEdge({ ...params, type: "department" }, eds));
    },
    [selectedNodeId, nodes, setEdges],
  );

  /**
   * FR-2.2: エッジ削除（選択状態チェック）
   */
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const edge = deletedEdges[0];
      if (
        !edge ||
        !selectedNodeId ||
        (edge.source !== selectedNodeId && edge.target !== selectedNodeId)
      ) {
        toast.error("選択されたノードのエッジのみ削除できます");
        return;
      }
    },
    [selectedNodeId],
  );

  /**
   * ノード選択
   */
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  /**
   * 背景クリックで選択解除
   */
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edgesWithSelection}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        panOnDrag
        panOnScroll
        zoomOnPinch
        minZoom={0.5}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
