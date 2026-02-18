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
import { Save, ArrowDownUp, Pencil, X } from "lucide-react";
import { CreateDepartmentDialog } from "./CreateDepartmentDialog";
import { DeleteDepartmentConfirmDialog } from "./DeleteDepartmentConfirmDialog";
import { MoveConfirmDialog, type MoveOperation } from "./MoveConfirmDialog";
import { ChangeParentDialog } from "./ChangeParentDialog";
import type {
  Department,
  OrgData,
} from "@/features/org-structure/utils/mock/mockOrgData";
import {
  DepartmentNode,
  type DepartmentNodeType,
} from "@/features/org-structure/components/nodes/DepartmentNode";
import {
  DepartmentEdge,
  type DepartmentEdgeType,
} from "@/features/org-structure/components/edges/DepartmentEdge";
import { getLayoutedElements } from "@/features/org-structure/utils/layoutNodes";
import { convertOrgDataToFlow } from "@/features/org-structure/utils/orgDataConverter";
import { detectOrphanedDepartments } from "@/features/org-structure/utils/validation";
import { api } from "@/trpc/react";

// カスタムノードとエッジの型定義
const nodeTypes = { department: DepartmentNode };
const edgeTypes = { department: DepartmentEdge };

type MapViewProps = {
  orgData: OrgData;
  organizationId: string;
  nodes: DepartmentNodeType[];
  edges: DepartmentEdgeType[];
  onNodesChange: (nodes: DepartmentNodeType[]) => void;
  onEdgesChange: (edges: DepartmentEdgeType[]) => void;
  onArrangeNodesRef: React.MutableRefObject<(() => void) | null>;
  onArrangeNodes: () => void;
  onNodeSelect?: (groupId: string | null) => void;
  onEditModeChange?: (isEditMode: boolean) => void;
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
  organizationId,
  nodes: parentNodes,
  edges: parentEdges,
  onNodesChange,
  onEdgesChange,
  onArrangeNodesRef,
  onArrangeNodes,
  onNodeSelect,
  onEditModeChange,
}: MapViewProps) => {
  const [nodes, setNodes, onNodesChangeInternal] =
    useNodesState<DepartmentNodeType>([]);
  const [edges, setEdges, onEdgesChangeInternal] =
    useEdgesState<DepartmentEdgeType>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // 親部署変更ダイアログ用の状態
  const [departmentToChangeParent, setDepartmentToChangeParent] =
    useState<Department | null>(null);

  // 編集モードの変更を親に通知
  useEffect(() => {
    onEditModeChange?.(isEditMode);
  }, [isEditMode, onEditModeChange]);

  // 編集開始時のエッジを保存（変更検出用）
  const initialEdgesRef = useRef<DepartmentEdgeType[]>([]);

  // 移動確認モーダル用の状態
  const [pendingMoves, setPendingMoves] = useState<MoveOperation[]>([]);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);

  const utils = api.useUtils();

  // グループ移動mutation
  const moveMutation = api.group.move.useMutation();

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

    // 編集モード中にorgDataが更新された場合、initialEdgesRefも更新
    // これにより、新しく作成された部署の親変更も検出可能になる
    if (isEditMode) {
      initialEdgesRef.current = rawEdges;
    }
  }, [orgData, setNodes, setEdges, isEditMode]);

  // ノードとエッジの変更を親に通知
  useEffect(() => {
    onNodesChange(nodes);
  }, [nodes, onNodesChange]);

  useEffect(() => {
    onEdgesChange(edges);
  }, [edges, onEdgesChange]);

  // エッジに選択状態を反映（編集モード時のみ削除可能）
  const edgesWithSelection = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        isRelatedToSelected:
          isEditMode && selectedNodeId
            ? edge.source === selectedNodeId || edge.target === selectedNodeId
            : undefined,
        onDelete: isEditMode
          ? (edgeId: string) => {
              setEdges((eds) => eds.filter((e) => e.id !== edgeId));
              toast.success("エッジを削除しました");
            }
          : undefined,
      },
    }));
  }, [edges, selectedNodeId, setEdges, isEditMode]);

  /**
   * FR-1.2: エッジ作成（選択状態チェック、編集モード時のみ）
   */
  const onConnect = useCallback(
    (params: Connection) => {
      // 編集モードでない場合は何もしない
      if (!isEditMode) {
        return;
      }

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
    [selectedNodeId, nodes, setEdges, isEditMode],
  );

  /**
   * FR-2.2: エッジ削除（選択状態チェック、編集モード時のみ）
   */
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      // 編集モードでない場合は何もしない
      if (!isEditMode) {
        return;
      }

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
    [selectedNodeId, isEditMode],
  );

  /**
   * ノード選択
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      onNodeSelect?.(node.id);
    },
    [onNodeSelect],
  );

  /**
   * 背景クリックで選択解除
   */
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  /**
   * エッジ変更を検出して移動操作を生成
   */
  const detectEdgeChanges = useCallback((): MoveOperation[] => {
    const moves: MoveOperation[] = [];

    // 初期エッジから親子関係マップを作成（target -> source）
    const initialParentMap = new Map<string, string>();
    for (const edge of initialEdgesRef.current) {
      initialParentMap.set(edge.target, edge.source);
    }

    // 現在のエッジから親子関係マップを作成
    const currentParentMap = new Map<string, string>();
    for (const edge of edges) {
      currentParentMap.set(edge.target, edge.source);
    }

    // 親が変わったグループを検出
    for (const [childId, currentParentId] of currentParentMap.entries()) {
      const initialParentId = initialParentMap.get(childId);
      if (initialParentId && initialParentId !== currentParentId) {
        // 親が変更された
        const childNode = nodes.find((n) => n.id === childId);
        const oldParentNode = nodes.find((n) => n.id === initialParentId);
        const newParentNode = nodes.find((n) => n.id === currentParentId);

        if (childNode && oldParentNode && newParentNode) {
          moves.push({
            groupId: childId,
            groupName: childNode.data.name,
            oldParentId: initialParentId,
            oldParentName: oldParentNode.data.name,
            newParentId: currentParentId,
            newParentName: newParentNode.data.name,
          });
        }
      }
    }

    return moves;
  }, [edges, nodes]);

  /**
   * 保存ボタンクリック時の処理
   * 変更がある場合は確認モーダルを表示、ない場合は編集モードを終了
   */
  const handleSaveClick = useCallback(() => {
    if (hasOrphanedDepartments) {
      toast.error("全ての部署に親部署を設定してください");
      return;
    }

    const moves = detectEdgeChanges();

    if (moves.length === 0) {
      // 変更なし、編集モード終了
      setIsEditMode(false);
      toast.success("編集を終了しました");
      return;
    }

    // 変更あり、確認モーダルを表示
    setPendingMoves(moves);
    setShowMoveConfirm(true);
  }, [hasOrphanedDepartments, detectEdgeChanges]);

  /**
   * 確認後の保存実行
   */
  const handleConfirmSave = useCallback(async () => {
    try {
      // 各移動を順番に実行
      for (const move of pendingMoves) {
        await moveMutation.mutateAsync({
          organizationId,
          groupId: move.groupId,
          newParentGroupId: move.newParentId,
        });
      }

      // 成功時
      setShowMoveConfirm(false);
      setPendingMoves([]);
      setIsEditMode(false);
      toast.success("組織構造を保存しました");

      // データを再取得
      await utils.group.list.invalidate();
    } catch {
      toast.error("保存に失敗しました");
    }
  }, [pendingMoves, organizationId, moveMutation, utils.group.list]);

  /**
   * 確認モーダルキャンセル
   */
  const handleCancelSave = useCallback(() => {
    setShowMoveConfirm(false);
    setPendingMoves([]);
  }, []);

  /**
   * 編集モードを開始（初期エッジを保存）
   */
  const handleStartEdit = useCallback(() => {
    initialEdgesRef.current = [...edges];
    setIsEditMode(true);
  }, [edges]);

  /**
   * 編集モードを終了（変更を破棄）
   */
  const handleCancelEdit = useCallback(() => {
    // 初期エッジに戻す
    setEdges(initialEdgesRef.current);
    setIsEditMode(false);
    toast.info("編集をキャンセルしました");
  }, [setEdges]);

  /**
   * ノード削除ボタンクリック時のハンドラー
   */
  const handleNodeDeleteClick = useCallback(
    (nodeId: string) => {
      const department = orgData.departments.find((d) => d.id === nodeId);
      if (department && !department.isRoot) {
        setDepartmentToDelete(department);
      }
    },
    [orgData.departments],
  );

  /**
   * 親部署変更ボタンクリック時のハンドラー
   */
  const handleChangeParentClick = useCallback(
    (nodeId: string) => {
      const department = orgData.departments.find((d) => d.id === nodeId);
      if (department && !department.isRoot) {
        setDepartmentToChangeParent(department);
      }
    },
    [orgData.departments],
  );

  /**
   * 親部署変更実行時のハンドラー
   * エッジを更新する（古いエッジを削除して新しいエッジを作成）
   */
  const handleChangeParent = useCallback(
    (targetId: string, newParentId: string) => {
      setEdges((currentEdges) => {
        // 対象ノードへの既存のエッジを削除
        const filteredEdges = currentEdges.filter(
          (edge) => edge.target !== targetId,
        );

        // 新しいエッジを作成
        const newEdge: DepartmentEdgeType = {
          id: `${newParentId}-${targetId}`,
          source: newParentId,
          target: targetId,
          type: "department",
        };

        return [...filteredEdges, newEdge];
      });

      toast.success("親部署を変更しました");
    },
    [setEdges],
  );

  // ノードに削除・親部署変更コールバックを追加（編集モード時のみ）
  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: isEditMode ? handleNodeDeleteClick : undefined,
        onChangeParent: isEditMode ? handleChangeParentClick : undefined,
      },
    }));
  }, [nodes, handleNodeDeleteClick, handleChangeParentClick, isEditMode]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodesWithHandlers}
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
        nodesDraggable={isEditMode}
        nodesConnectable={isEditMode}
        elementsSelectable={isEditMode}
      >
        <Background />
        <Controls />
        <MiniMap />

        {/* ボード内ボタン */}
        <Panel position="top-right" className="flex gap-2">
          {isEditMode ? (
            <>
              <CreateDepartmentDialog
                organizationId={organizationId}
                departments={orgData.departments}
              />

              <Button
                onClick={onArrangeNodes}
                variant="outline"
                size="sm"
                className="bg-background h-8 gap-1.5 px-2.5 text-xs shadow-md"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                レイアウト調整
              </Button>

              <Button
                onClick={handleCancelEdit}
                variant="outline"
                size="sm"
                className="bg-background h-8 gap-1.5 px-2.5 text-xs shadow-md"
              >
                <X className="h-3.5 w-3.5" />
                キャンセル
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={handleSaveClick}
                        disabled={hasOrphanedDepartments}
                        size="sm"
                        className="h-8 gap-1.5 px-2.5 text-xs shadow-md"
                      >
                        <Save className="h-3.5 w-3.5" />
                        保存して終了
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
            </>
          ) : (
            <Button
              onClick={handleStartEdit}
              variant="outline"
              size="sm"
              className="bg-background h-8 gap-1.5 px-2.5 text-xs shadow-md"
            >
              <Pencil className="h-3.5 w-3.5" />
              編集
            </Button>
          )}
        </Panel>
      </ReactFlow>

      {/* 削除確認ダイアログ */}
      <DeleteDepartmentConfirmDialog
        organizationId={organizationId}
        department={departmentToDelete}
        onClose={() => setDepartmentToDelete(null)}
      />

      {/* 移動確認ダイアログ */}
      <MoveConfirmDialog
        open={showMoveConfirm}
        moves={pendingMoves}
        isLoading={moveMutation.isPending}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
      />

      {/* 親部署変更ダイアログ */}
      <ChangeParentDialog
        isOpen={departmentToChangeParent !== null}
        onClose={() => setDepartmentToChangeParent(null)}
        targetDepartment={departmentToChangeParent}
        departments={orgData.departments}
        edges={edges}
        onChangeParent={handleChangeParent}
      />
    </div>
  );
};
