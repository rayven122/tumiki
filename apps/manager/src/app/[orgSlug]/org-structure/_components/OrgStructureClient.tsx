"use client";

import { useState, useRef, useMemo } from "react";
import { useAtomValue } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { cn } from "@/lib/utils";
import { MapView } from "./MapView";
import type { DepartmentNodeType } from "./nodes/DepartmentNode";
import type { DepartmentEdgeType } from "./edges/DepartmentEdge";
import { api } from "@/trpc/react";
import {
  keycloakGroupsToOrgData,
  extractAllGroupIds,
} from "./utils/keycloakToOrgDataConverter";
import type { OrgData } from "./mock/mockOrgData";

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

  // ローディング状態
  if (groupsLoading || membersLoading) {
    return (
      <div
        className={cn(
          "fixed inset-0 top-14 flex items-center justify-center",
          isOpen ? "md:left-64" : "md:left-16",
        )}
      >
        <div className="text-muted-foreground">
          組織構造を読み込んでいます...
        </div>
      </div>
    );
  }

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

  // データなし（通常は発生しない - 空でもルートノードが作成される）
  if (!orgData) {
    return (
      <div
        className={cn(
          "fixed inset-0 top-14 flex items-center justify-center",
          isOpen ? "md:left-64" : "md:left-16",
        )}
      >
        <div className="text-muted-foreground">
          データの読み込みに失敗しました
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
        orgData={orgData}
        organizationId={organizationId}
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
        onArrangeNodesRef={arrangeNodesRef}
        onArrangeNodes={handleArrangeNodes}
      />
    </div>
  );
};
