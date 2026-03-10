"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { ChevronRight, ChevronDown, Users, UserCircle2 } from "lucide-react";
import type {
  OrgData,
  Department,
} from "@/features/org-structure/utils/mock/mockOrgData";

type ListViewProps = {
  orgData: OrgData;
  onNodeSelect: (groupId: string | null) => void;
};

/**
 * 階層構造を持つ部署ノードの型
 */
type DepartmentTreeNode = Department & {
  children: DepartmentTreeNode[];
  level: number;
};

/**
 * relationsからツリー構造を構築する
 */
const buildTree = (orgData: OrgData): DepartmentTreeNode[] => {
  const { departments, relations } = orgData;

  // 親子関係のマップを作成
  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const relation of relations) {
    const children = childrenMap.get(relation.parentId) ?? [];
    children.push(relation.childId);
    childrenMap.set(relation.parentId, children);
    hasParent.add(relation.childId);
  }

  // 部署IDからDepartmentへのマップ
  const departmentMap = new Map<string, Department>();
  for (const dept of departments) {
    departmentMap.set(dept.id, dept);
  }

  // 再帰的にツリーを構築
  const buildNode = (
    deptId: string,
    level: number,
  ): DepartmentTreeNode | null => {
    const dept = departmentMap.get(deptId);
    if (!dept) return null;

    const childIds = childrenMap.get(deptId) ?? [];
    const children = childIds
      .map((childId) => buildNode(childId, level + 1))
      .filter((node): node is DepartmentTreeNode => node !== null);

    return {
      ...dept,
      children,
      level,
    };
  };

  // ルートノード（親を持たない部署）を探す
  const rootIds = departments
    .filter((dept) => !hasParent.has(dept.id))
    .map((dept) => dept.id);

  return rootIds
    .map((id) => buildNode(id, 0))
    .filter((node): node is DepartmentTreeNode => node !== null);
};

/**
 * 単一のツリーノードコンポーネント
 */
const TreeNode = ({
  node,
  onNodeSelect,
  expandedIds,
  toggleExpand,
}: {
  node: DepartmentTreeNode;
  onNodeSelect: (groupId: string | null) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  const IconComponent = Icons[
    node.icon as keyof typeof Icons
  ] as React.ComponentType<{
    className?: string;
  }>;

  return (
    <div>
      {/* ノード本体 */}
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition-all hover:border-gray-200 hover:bg-gray-50",
        )}
        style={{ paddingLeft: `${node.level * 24 + 12}px` }}
        onClick={() => onNodeSelect(node.id)}
      >
        {/* 展開/折りたたみアイコン */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* アイコン */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${node.color}15 0%, ${node.color}30 100%)`,
            border: `1px solid ${node.color}40`,
            color: node.color,
          }}
        >
          {IconComponent && <IconComponent className="h-5 w-5" />}
        </div>

        {/* 部署名 */}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{node.name}</h4>
          {node.isRoot && (
            <span className="text-xs text-gray-500">ルート組織</span>
          )}
        </div>

        {/* リーダー情報 */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            {node.leader.avatarUrl ? (
              <img
                src={node.leader.avatarUrl}
                alt={node.leader.name}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserCircle2 className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <span className="hidden sm:inline">{node.leader.name}</span>
        </div>

        {/* メンバー数 */}
        <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{node.memberCount}</span>
        </div>
      </div>

      {/* 子ノード */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onNodeSelect={onNodeSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * リストツリー表示コンポーネント
 *
 * 組織構造を階層的なリストとして表示する。
 * 折りたたみ/展開機能を持ち、各行をクリックすると詳細サイドバーが開く。
 */
export const ListView = ({ orgData, onNodeSelect }: ListViewProps) => {
  // 全ノードをデフォルトで展開
  const allIds = useMemo(() => {
    return new Set(orgData.departments.map((d) => d.id));
  }, [orgData.departments]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(allIds);

  const tree = useMemo(() => buildTree(orgData), [orgData]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (tree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">組織構造がありません</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white p-6 pt-20">
      {/* 展開/折りたたみコントロール */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={expandAll}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          すべて展開
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          すべて折りたたむ
        </button>
      </div>

      {/* ツリー表示 */}
      <div className="space-y-1">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            onNodeSelect={onNodeSelect}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
};
