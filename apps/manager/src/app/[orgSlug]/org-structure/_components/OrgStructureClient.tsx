"use client";

import { useState, useRef } from "react";
import { useAtomValue } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { cn } from "@/lib/utils";
import { MapView } from "./MapView";
import { mockOrgData } from "./mock/mockOrgData";
import type { DepartmentNodeType } from "./nodes/DepartmentNode";
import type { DepartmentEdgeType } from "./edges/DepartmentEdge";

/**
 * 組織構造編集ページのメインClient Component
 *
 * 役割:
 * - モックデータ管理（useState）
 * - MapView の統合
 * - ノードとエッジの状態管理
 * - レイアウト調整機能の制御
 */
export const OrgStructureClient = () => {
  const [orgData] = useState(mockOrgData);
  const [nodes, setNodes] = useState<DepartmentNodeType[]>([]);
  const [edges, setEdges] = useState<DepartmentEdgeType[]>([]);
  const isOpen = useAtomValue(sidebarOpenAtom);

  // レイアウト調整関数のref
  const arrangeNodesRef = useRef<(() => void) | null>(null);

  /**
   * レイアウト調整ボタンのハンドラー
   */
  const handleArrangeNodes = () => {
    arrangeNodesRef.current?.();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 top-14 transition-all duration-300",
        isOpen ? "md:left-64" : "md:left-16",
      )}
    >
      <MapView
        orgData={orgData}
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
