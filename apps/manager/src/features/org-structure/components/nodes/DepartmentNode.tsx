"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Users, UserCircle2, X, Shield, ArrowUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  Member,
  Role,
} from "@/features/org-structure/utils/mock/mockOrgData";

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
  roles?: Role[]; // 割り当てられたロール一覧
  isRoot?: boolean;
  onDelete?: (nodeId: string) => void; // 削除ボタンクリック時のコールバック
  onChangeParent?: (nodeId: string) => void; // 親部署変更ボタンクリック時のコールバック
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
  ({ id, data, selected }: NodeProps<DepartmentNodeType>) => {
    const IconComponent = Icons[
      data.icon as keyof typeof Icons
    ] as React.ComponentType<{
      className?: string;
    }>;

    // 削除ボタンのクリックハンドラー
    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // ノード選択イベントを止める
      data.onDelete?.(id);
    };

    // 親部署変更ボタンのクリックハンドラー
    const handleChangeParentClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // ノード選択イベントを止める
      data.onChangeParent?.(id);
    };

    // 削除ボタンを表示するか（選択中かつルートでない場合）
    const showDeleteButton = selected && !data.isRoot && data.onDelete;

    // 親部署変更ボタンを表示するか（選択中かつルートでない場合）
    const showChangeParentButton =
      selected && !data.isRoot && data.onChangeParent;

    // メンバーアイコン表示：最大4人まで、残りは "+N" で省略
    const maxVisibleMembers = 4;
    const members = data.members ?? [];
    const visibleMembers = members.slice(0, maxVisibleMembers);
    const remainingMemberCount = Math.max(
      0,
      members.length - maxVisibleMembers,
    );

    // ロールアイコン表示：最大3つまで、残りは "+N" で省略
    const maxVisibleRoles = 3;
    const roles = data.roles ?? [];
    const visibleRoles = roles.slice(0, maxVisibleRoles);
    const remainingRoleCount = Math.max(0, roles.length - maxVisibleRoles);

    return (
      <div
        className={cn(
          "group relative min-w-[320px] rounded-2xl border-2 bg-white p-6 transition-all duration-300",
          selected
            ? "border-transparent shadow-2xl ring-4 shadow-blue-500/30 ring-blue-500/20"
            : "border-gray-200/80 shadow-lg hover:border-gray-300 hover:shadow-xl",
        )}
      >
        {/* 編集モード時のアクションボタン（選択時のみ表示） */}
        {(Boolean(showDeleteButton) || Boolean(showChangeParentButton)) && (
          <div className="absolute -top-2 -right-2 z-10 flex gap-1">
            {/* 親部署変更ボタン */}
            {showChangeParentButton && (
              <button
                type="button"
                onClick={handleChangeParentClick}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-blue-600"
                title="親部署を変更"
              >
                <ArrowUpDown className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
            {/* 削除ボタン */}
            {showDeleteButton && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600"
                title="部署を削除"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

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
        <div className="mb-3 flex items-center gap-4">
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

        {/* ロールバッジ（チーム名直下） */}
        {roles.length > 0 && (
          <TooltipProvider>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {visibleRoles.map((role) => (
                <Tooltip key={role.roleSlug}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-gradient-to-r from-violet-50 to-purple-50 px-2.5 py-1 shadow-sm transition-transform hover:scale-105">
                      <Shield
                        className="h-3.5 w-3.5 text-purple-600"
                        strokeWidth={2.5}
                      />
                      <span className="max-w-[80px] truncate text-xs font-medium text-purple-700">
                        {role.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {role.name}
                  </TooltipContent>
                </Tooltip>
              ))}
              {remainingRoleCount > 0 && (
                <div className="flex h-6 items-center justify-center rounded-full bg-purple-100 px-2 text-[10px] font-bold text-purple-600">
                  +{remainingRoleCount}
                </div>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* 部署長 */}
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 px-4 py-2.5">
          <div className="relative h-6 w-6 overflow-hidden rounded-full border-2 border-blue-200">
            {data.leader.avatarUrl ? (
              <img
                src={data.leader.avatarUrl}
                alt={data.leader.name}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
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
            {data.memberCount ?? 0} メンバー
            {data.totalMemberCount !== undefined &&
              data.totalMemberCount > (data.memberCount ?? 0) && (
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
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-bold text-gray-700">
                    {member.initials}
                  </div>
                )}
              </div>
            ))}
          </div>
          {remainingMemberCount > 0 && (
            <div className="ml-1 flex h-8 items-center justify-center rounded-full bg-gray-200 px-2.5 text-xs font-bold text-gray-600">
              +{remainingMemberCount}
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
