"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, ArrowDownUp } from "lucide-react";
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
import { detectOrphanedDepartments } from "./utils/validation";
import type { OrgData } from "./mock/mockOrgData";

// カスタムノードとエッジの型定義
const nodeTypes = { department: DepartmentNode };
const edgeTypes = { department: DepartmentEdge };

type MapViewProps = {
  orgData: OrgData;
  nodes: DepartmentNodeType[];
  edges: DepartmentEdgeType[];
  onNodesChange: (nodes: DepartmentNodeType[]) => void;
  onEdgesChange: (edges: DepartmentEdgeType[]) => void;
  onArrangeNodesRef: React.MutableRefObject<(() => void) | null>;
  onArrangeNodes: () => void;
};

/**
 * 組織図のマップビューコンポーネント
 *
 * 主要機能:
 * 1. React Flowセットアップ
 * 2. エッジ作成（選択状態チェック）
 * 3. エッジ削除（選択状態チェック）
 * 4. ノード選択管理
 * 5. ボード内ボタン表示（保存、レイアウト調整）
 */
export const MapView = ({
  orgData,
  nodes: parentNodes,
  edges: parentEdges,
  onNodesChange,
  onEdgesChange,
  onArrangeNodesRef,
  onArrangeNodes,
}: MapViewProps) => {
  const [nodes, setNodes, onNodesChangeInternal] =
    useNodesState<DepartmentNodeType>([]);
  const [edges, setEdges, onEdgesChangeInternal] =
    useEdgesState<DepartmentEdgeType>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 保存ボタンの状態制御
  const hasOrphanedDepartments = useMemo(() => {
    return detectOrphanedDepartments(parentNodes, parentEdges);
  }, [parentNodes, parentEdges]);

  // nodesとedgesの最新値を保持するref（無限レンダリング防止）
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // nodesとedgesが変更されたらrefを更新
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // レイアウト調整関数（useCallbackで安定化）
  // 依存配列からnodesとedgesを除外し、refを使用して最新値を参照
  const arrangeNodesCallback = useCallback(() => {
    const layoutedNodes = getLayoutedElements(
      nodesRef.current,
      edgesRef.current,
    );
    setNodes(layoutedNodes);
    toast.success("レイアウトを調整しました");
  }, [setNodes]);

  // レイアウト調整関数をrefに設定（クリーンアップ処理付き）
  useEffect(() => {
    onArrangeNodesRef.current = arrangeNodesCallback;

    // クリーンアップ処理を追加
    return () => {
      onArrangeNodesRef.current = null;
    };
  }, [arrangeNodesCallback, onArrangeNodesRef]);

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

  /**
   * 保存処理
   */
  const handleSave = useCallback(() => {
    if (hasOrphanedDepartments) {
      toast.error("全ての部署に親部署を設定してください");
      return;
    }

    // TODO: tRPC経由でKeycloak APIに保存
    toast.success("組織構造を保存しました");
  }, [hasOrphanedDepartments]);

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
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap />

        {/* ボード内ボタン */}
        <Panel position="top-right" className="flex gap-2">
          <Button
            onClick={onArrangeNodes}
            variant="outline"
            size="sm"
            className="bg-background h-8 gap-1.5 px-2.5 text-xs shadow-md"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            レイアウト調整
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleSave}
                    disabled={hasOrphanedDepartments}
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs shadow-md"
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存
                  </Button>
                </span>
              </TooltipTrigger>
              {hasOrphanedDepartments && (
                <TooltipContent>
                  <p>全ての部署に親部署を設定してください</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </Panel>
      </ReactFlow>
    </div>
  );
};
