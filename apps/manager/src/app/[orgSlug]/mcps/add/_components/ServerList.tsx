"use client";

import type React from "react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Plus } from "lucide-react";

import { ServerCard } from "../../_components/ServerCard";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { RemoteMcpServerModal } from "./RemoteMcpServerModal";
import type { Prisma } from "@tumiki/db/prisma";

type McpServerTemplateWithTools = Prisma.McpServerTemplateGetPayload<{
  include: { mcpTools: true };
}> & {
  tools: Prisma.McpToolGetPayload<object>[];
  isOrgTemplate?: boolean;
};

const AsyncServerList = ({
  onCreateServerClick,
  searchQuery,
  selectedTags,
  mcpServers,
}: {
  onCreateServerClick: () => void;
  searchQuery: string;
  selectedTags: string[];
  mcpServers: McpServerTemplateWithTools[];
}) => {
  // フィルタリング
  const filteredServers = mcpServers.filter((server) => {
    // STDIO サーバーを除外（リモートMCPサーバーのみ表示）
    if (server.transportType === "STDIO") {
      return false;
    }

    // 検索クエリでのフィルタリング
    const matchesSearch = server.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // タグでのフィルタリング（DBのtagsフィールドを使用）
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => server.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
      <Card
        className="flex h-full min-h-[200px] cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 transition-colors hover:border-purple-400 hover:bg-purple-50"
        onClick={onCreateServerClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Plus className="mb-2 h-12 w-12 text-gray-400" />
          <p className="text-center text-sm font-medium text-gray-600">
            カスタムMCPを追加
          </p>
        </CardContent>
      </Card>
      {filteredServers.map((mcpServer) => (
        <ServerCard key={mcpServer.id} mcpServer={mcpServer} />
      ))}
    </div>
  );
};

type ServerListProps = {
  orgSlug: string;
  // Controlled props（オプショナル）
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  selectedTags?: string[];
  onSelectedTagsChange?: (tags: string[]) => void;
  // UI制御
  showFilteringUI?: boolean;
};

export const ServerList = ({
  orgSlug,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  selectedTags: externalSelectedTags,
  onSelectedTagsChange,
  showFilteringUI = true,
}: ServerListProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 内部状態（uncontrolled時のみ使用）
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalSelectedTags, setInternalSelectedTags] = useState<string[]>(
    [],
  );

  // MCPサーバーから利用可能なタグを動的に取得
  const [mcpServers] = api.mcpServer.findAll.useSuspenseQuery();

  // Controlled判定
  const isControlled =
    externalSearchQuery !== undefined &&
    onSearchQueryChange !== undefined &&
    externalSelectedTags !== undefined &&
    onSelectedTagsChange !== undefined;

  // 実際に使用する値
  const searchQuery = isControlled ? externalSearchQuery : internalSearchQuery;
  const selectedTags = isControlled
    ? externalSelectedTags
    : internalSelectedTags;

  // 全サーバーからユニークなタグを抽出
  const availableTags = useMemo(() => {
    if (!mcpServers) return [];
    const allTags = mcpServers.flatMap((server) => server.tags);
    return Array.from(new Set(allTags)).sort();
  }, [mcpServers]);

  const handleSearchQueryChange = (query: string) => {
    if (isControlled && onSearchQueryChange) {
      onSearchQueryChange(query);
    } else {
      setInternalSearchQuery(query);
    }
  };

  const handleSelectedTagsChange = (tags: string[]) => {
    if (isControlled && onSelectedTagsChange) {
      onSelectedTagsChange(tags);
    } else {
      setInternalSelectedTags(tags);
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    handleSelectedTagsChange(newTags);
  };

  const clearAllFilters = () => {
    handleSearchQueryChange("");
    handleSelectedTagsChange([]);
  };

  return (
    <>
      {/* フィルタリングUIは showFilteringUI が true の場合のみ表示 */}
      {showFilteringUI && (
        <div className="mb-6 space-y-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="MCPサーバーを検索..."
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* タグフィルター */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                カテゴリーで絞り込み
              </h3>
              {(searchQuery || selectedTags.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  フィルターをクリア
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "hover:border-purple-300 hover:bg-purple-50"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* 選択されたフィルター表示 */}
          {(searchQuery || selectedTags.length > 0) && (
            <div className="text-sm text-gray-600">
              {searchQuery && <span>検索: "{searchQuery}" </span>}
              {selectedTags.length > 0 && (
                <span>カテゴリー: {selectedTags.join(", ")}</span>
              )}
            </div>
          )}
        </div>
      )}

      <AsyncServerList
        onCreateServerClick={() => setCreateDialogOpen(true)}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        mcpServers={mcpServers}
      />
      <RemoteMcpServerModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        orgSlug={orgSlug}
      />
    </>
  );
};
