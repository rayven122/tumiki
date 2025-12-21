"use client";

import { useState, useRef } from "react";
import { MapView } from "./MapView";
import { OrgStructureHeader } from "./OrgStructureHeader";
import { mockOrgData } from "./mock/mockOrgData";
import type { DepartmentNodeType } from "./nodes/DepartmentNode";
import type { DepartmentEdgeType } from "./edges/DepartmentEdge";

type OrgStructureClientProps = {
  orgSlug: string;
};

/**
 * 組織構造編集ページのメインClient Component
 *
 * 役割:
 * - モックデータ管理（useState）
 * - OrgStructureHeader と MapView の統合
 * - ノードとエッジの状態管理
 * - レイアウト調整機能の制御
 */
export const OrgStructureClient = ({ orgSlug }: OrgStructureClientProps) => {
  const [orgData] = useState(mockOrgData);
  const [nodes, setNodes] = useState<DepartmentNodeType[]>([]);
  const [edges, setEdges] = useState<DepartmentEdgeType[]>([]);

  // レイアウト調整関数のref
  const arrangeNodesRef = useRef<(() => void) | null>(null);

  /**
   * レイアウト調整ボタンのハンドラー
   */
  const handleArrangeNodes = () => {
    arrangeNodesRef.current?.();
  };

  return (
    <div className="flex h-screen flex-col">
      <OrgStructureHeader
        orgSlug={orgSlug}
        nodes={nodes}
        edges={edges}
        onArrangeNodes={handleArrangeNodes}
      />

      <div className="flex-1">
        <MapView
          orgData={orgData}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onArrangeNodesRef={arrangeNodesRef}
        />
      </div>
    </div>
  );
};
