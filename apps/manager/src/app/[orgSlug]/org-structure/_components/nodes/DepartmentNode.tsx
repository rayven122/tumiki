"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Users, UserCircle2 } from "lucide-react";
import type { Member } from "../mock/mockOrgData";

/**
 * 部署ノードのデータ型
 */
export type DepartmentNodeData = {
  name: string;
  icon: string; // lucide-reactのアイコン名（例: "Building2"）
  color: string;
  leader: Member;
  members: Member[];
  memberCount: number;
  totalMemberCount?: number; // 子部署を含む合計メンバー数（オプション）
  isRoot?: boolean;
};

/**
 * 部署ノードの型
 */
export type DepartmentNodeType = Node<DepartmentNodeData>;

/**
 * 組織図の部署ノードコンポーネント（モダンデザイン）
 *
 * UI要件:
 * - 選択時: グロー効果、シャドウ強調
 * - 未選択時: 軽いシャドウ、ホバーエフェクト
 * - グラデーション背景でブランドカラー表現
 */
export const DepartmentNode = memo(
  ({ data, selected }: NodeProps<DepartmentNodeType>) => {
    const IconComponent = Icons[
      data.icon as keyof typeof Icons
    ] as React.ComponentType<{
      className?: string;
    }>;

    // メンバーアイコン表示：最大4人まで、残りは "+N" で省略
    const maxVisibleMembers = 4;
    const visibleMembers = data.members.slice(0, maxVisibleMembers);
    const remainingCount = Math.max(0, data.members.length - maxVisibleMembers);

    return (
      <div
        className={cn(
          "group relative min-w-[320px] rounded-2xl border-2 bg-white p-6 transition-all duration-300",
          selected
            ? "border-transparent shadow-2xl ring-4 shadow-blue-500/30 ring-blue-500/20"
            : "border-gray-200/80 shadow-lg hover:border-gray-300 hover:shadow-xl",
        )}
      >
        {/* トップハンドル（クリック範囲拡大） */}
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
          style={{
            padding: "8px", // クリック範囲を広げる
          }}
        />

        {/* アイコン＋チーム名 */}
        <div className="mb-4 flex items-center gap-4">
          {/* アイコン */}
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition-transform duration-300",
              selected ? "scale-110" : "group-hover:scale-105",
            )}
            style={{
              background: `linear-gradient(135deg, ${data.color}15 0%, ${data.color}30 100%)`,
              border: `2px solid ${data.color}40`,
              color: data.color,
            }}
          >
            {IconComponent && <IconComponent className="h-8 w-8" />}
          </div>

          {/* チーム名 */}
          <div className="flex-1">
            <h3 className="text-xl font-bold tracking-tight text-gray-900">
              {data.name}
            </h3>
          </div>
        </div>

        {/* 部署長 */}
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 px-4 py-2.5">
          <div className="relative h-6 w-6 overflow-hidden rounded-full border-2 border-blue-200">
            {data.leader.avatarUrl ? (
              <img
                src={data.leader.avatarUrl}
                alt={data.leader.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                <UserCircle2
                  className="h-4 w-4 text-blue-600"
                  strokeWidth={2.5}
                />
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {data.leader.name}
          </span>
        </div>

        {/* メンバー数 */}
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/50 px-4 py-2.5">
          <Users className="h-5 w-5 text-gray-600" strokeWidth={2.5} />
          <span className="text-sm font-semibold text-gray-700">
            {data.memberCount} メンバー
            {data.totalMemberCount !== undefined &&
              data.totalMemberCount > data.memberCount && (
                <span className="ml-1 text-gray-500">
                  （合計 {data.totalMemberCount}人）
                </span>
              )}
          </span>
        </div>

        {/* メンバーアイコン（重なり表示） */}
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {visibleMembers.map((member, index) => (
              <div
                key={member.id}
                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white shadow-sm transition-transform hover:z-10 hover:scale-110"
                style={{ zIndex: visibleMembers.length - index }}
                title={member.name}
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-bold text-gray-700">
                    {member.initials}
                  </div>
                )}
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <div className="ml-1 flex h-8 items-center justify-center rounded-full bg-gray-200 px-2.5 text-xs font-bold text-gray-600">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* ボトムハンドル（クリック範囲拡大） */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          className={cn(
            "h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transition-opacity duration-300",
            selected ? "opacity-100" : "opacity-0",
          )}
          style={{
            padding: "8px", // クリック範囲を広げる
          }}
        />
      </div>
    );
  },
);

DepartmentNode.displayName = "DepartmentNode";
