"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { McpServerVisibility } from "@tumiki/db/prisma";
import { Bot, Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { getSessionInfo } from "~/lib/auth/session-utils";

import { AgentCardList } from "./AgentCardList";
import { EmptyState } from "./EmptyState";

type AgentsPageClientProps = {
  orgSlug: string;
};

// 可視性フィルターの選択肢
const VISIBILITY_OPTIONS = [
  { value: "ALL" as const, label: "すべて" },
  { value: McpServerVisibility.PRIVATE, label: "自分のみ" },
  { value: McpServerVisibility.ORGANIZATION, label: "組織内" },
] as const;

// 可視性から表示ラベルを取得するマップ
const VISIBILITY_LABEL_MAP: Record<McpServerVisibility | "ALL", string> = {
  ALL: "すべて",
  [McpServerVisibility.PRIVATE]: "自分のみ",
  [McpServerVisibility.ORGANIZATION]: "組織内",
  [McpServerVisibility.PUBLIC]: "公開",
};

/**
 * エージェント一覧ページのクライアントコンポーネント
 */
export const AgentsPageClient = ({ orgSlug }: AgentsPageClientProps) => {
  const { data: session } = useSession();
  const isAdmin = getSessionInfo(session).isAdmin;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisibility, setSelectedVisibility] = useState<
    McpServerVisibility | "ALL"
  >("ALL");

  const { data: agents } = api.v2.agent.findAll.useQuery();
  const agentCount = agents?.length ?? 0;

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedVisibility("ALL");
  };

  const hasActiveFilters = searchQuery || selectedVisibility !== "ALL";

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">エージェント</h1>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href={`/${orgSlug}/agents/create`}>
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        )}
      </div>

      {/* フィルタリングUI */}
      {agentCount > 0 && (
        <div className="mb-6 space-y-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="エージェントを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 可視性フィルター */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                公開範囲で絞り込み
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  フィルターをクリア
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = selectedVisibility === option.value;
                return (
                  <Badge
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    className={
                      isSelected
                        ? "cursor-pointer bg-purple-600 text-white transition-colors hover:bg-purple-700"
                        : "cursor-pointer transition-colors hover:border-purple-300 hover:bg-purple-50"
                    }
                    onClick={() => setSelectedVisibility(option.value)}
                  >
                    {option.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* 選択されたフィルター表示 */}
          {hasActiveFilters && (
            <div className="text-sm text-gray-600">
              {searchQuery && <span>検索: &quot;{searchQuery}&quot; </span>}
              {selectedVisibility !== "ALL" && (
                <span>
                  公開範囲: {VISIBILITY_LABEL_MAP[selectedVisibility]}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* エージェント一覧または空状態 */}
      <div>
        {agentCount === 0 ? (
          <EmptyState isAdmin={isAdmin} orgSlug={orgSlug} />
        ) : (
          <AgentCardList
            searchQuery={searchQuery}
            selectedVisibility={selectedVisibility}
          />
        )}
      </div>
    </div>
  );
};
