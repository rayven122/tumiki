"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { cn } from "@/lib/utils";
import { MapView } from "./MapView";
import { GroupDetailSidebar } from "./sidebar/GroupDetailSidebar";
import type { DepartmentNodeType } from "./nodes/DepartmentNode";
import type { DepartmentEdgeType } from "./edges/DepartmentEdge";
import { api } from "@/trpc/react";
import {
  keycloakGroupsToOrgData,
  extractAllGroupIds,
} from "./utils/keycloakToOrgDataConverter";
import type { OrgData } from "./mock/mockOrgData";
import { Loader2, Network } from "lucide-react";

/**
 * 空の組織データ（ローディング中に使用）
 */
const emptyOrgData: OrgData = {
  departments: [],
  relations: [],
};

/**
 * ローディングオーバーレイコンポーネント
 */
const LoadingOverlay = () => (
  <div className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Network className="text-muted-foreground h-12 w-12" />
        <Loader2 className="text-primary absolute -right-1 -bottom-1 h-5 w-5 animate-spin" />
      </div>
      <p className="text-muted-foreground text-sm">
        組織構造を読み込んでいます...
      </p>
    </div>
  </div>
);

type OrgStructureClientProps = {
  organizationId: string;
};

/**
 * 組織構造編集ページのメインClient Component
 *
 * 役割:
 * - Keycloakグループデータの取得と変換
 * - MapView の統合
 * - ノードとエッジの状態管理
 * - レイアウト調整機能の制御
 */
export const OrgStructureClient = ({
  organizationId,
}: OrgStructureClientProps) => {
  const [nodes, setNodes] = useState<DepartmentNodeType[]>([]);
  const [edges, setEdges] = useState<DepartmentEdgeType[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const isOpen = useAtomValue(sidebarOpenAtom);

  // レイアウト調整関数のref
  const arrangeNodesRef = useRef<(() => void) | null>(null);

  // 1. グループ一覧を取得
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = api.v2.group.list.useQuery({ organizationId });

  // 2. 全グループIDを抽出
  const groupIds = useMemo(() => {
    if (!groups) return [];
    return extractAllGroupIds(groups);
  }, [groups]);

  // 3. メンバー情報を取得
  const { data: membersMap, isLoading: membersLoading } =
    api.v2.group.getMembers.useQuery(
      { organizationId, groupIds },
      { enabled: groupIds.length > 0 },
    );

  // 4. データを変換
  const orgData: OrgData | null = useMemo(() => {
    if (!groups) return null;
    return keycloakGroupsToOrgData(groups, {
      membersMap,
    });
  }, [groups, membersMap]);

  /**
   * レイアウト調整ボタンのハンドラー
   */
  const handleArrangeNodes = () => {
    arrangeNodesRef.current?.();
  };

  /**
   * ノード選択ハンドラー
   */
  const handleNodeSelect = useCallback((groupId: string | null) => {
    setSelectedGroupId(groupId);
  }, []);

  /**
   * サイドバーを閉じるハンドラー
   */
  const handleSidebarClose = useCallback(() => {
    setSelectedGroupId(null);
  }, []);

  /**
   * 編集モード変更ハンドラー
   */
  const handleEditModeChange = useCallback((editMode: boolean) => {
    setIsEditMode(editMode);
    // 編集モードに入ったらサイドバーを閉じる
    if (editMode) {
      setSelectedGroupId(null);
    }
  }, []);

  /**
   * 選択されたグループの部署情報を取得
   */
  const selectedDepartment = useMemo(() => {
    if (!selectedGroupId || !orgData) return null;
    return orgData.departments.find((d) => d.id === selectedGroupId) ?? null;
  }, [selectedGroupId, orgData]);

  const isLoading = groupsLoading || membersLoading;

  // エラー状態
  if (groupsError) {
    return (
      <div
        className={cn(
          "fixed inset-0 top-14 flex items-center justify-center",
          isOpen ? "md:left-64" : "md:left-16",
        )}
      >
        <div className="text-destructive">
          エラーが発生しました: {groupsError.message}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 top-14 transition-all duration-300",
        isOpen ? "md:left-64" : "md:left-16",
      )}
    >
      <MapView
        orgData={orgData ?? emptyOrgData}
        organizationId={organizationId}
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
        onArrangeNodesRef={arrangeNodesRef}
        onArrangeNodes={handleArrangeNodes}
        onNodeSelect={handleNodeSelect}
        onEditModeChange={handleEditModeChange}
      />

      {/* グループ詳細サイドバー（編集モード中は非表示） */}
      {!isEditMode && (
        <GroupDetailSidebar
          department={selectedDepartment}
          groupId={selectedGroupId}
          organizationId={organizationId}
          isOpen={selectedGroupId !== null}
          onClose={handleSidebarClose}
          canEdit={true}
        />
      )}

      {/* ローディング中はオーバーレイを表示 */}
      {isLoading && <LoadingOverlay />}
    </div>
  );
};
