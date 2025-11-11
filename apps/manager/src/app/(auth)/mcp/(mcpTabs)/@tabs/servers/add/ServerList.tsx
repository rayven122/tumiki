"use client";

import type React from "react";
import { Suspense, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";

import { ServerCardSkeleton } from "../../_components/ServerCard/ServerCardSkeleton";
import { ServerCard } from "../../_components/ServerCard";
import { AddRemoteServerCard } from "./AddRemoteServerCard";
import { CustomMcpServerModal } from "./CustomMcpServerModal";
import { api } from "@/trpc/react";

const AsyncServerList = ({
  onCreateServerClick,
  searchQuery,
  selectedTags,
}: {
  onCreateServerClick: () => void;
  searchQuery: string;
  selectedTags: string[];
}) => {
  const [mcpServers] = api.mcpServer.findAll.useSuspenseQuery();

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
    const serverTags = server.tags ?? [];
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => serverTags.includes(tag));

    return matchesSearch && matchesTags;
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <AddRemoteServerCard onConnect={onCreateServerClick} />
      {filteredServers.map((mcpServer) => (
        <ServerCard key={mcpServer.id} mcpServer={mcpServer} />
      ))}
    </div>
  );
};

const ServerListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ServerCardSkeleton key={i} />
      ))}
    </div>
  );
};

export function ServerList() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // MCPサーバーから利用可能なタグを動的に取得
  const { data: mcpServers } = api.mcpServer.findAll.useQuery();

  // 全サーバーからユニークなタグを抽出
  const availableTags = useMemo(() => {
    if (!mcpServers) return [];
    const allTags = mcpServers.flatMap((server) => server.tags ?? []);
    return Array.from(new Set(allTags)).sort();
  }, [mcpServers]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  return (
    <>
      {/* フィルタリングUI */}
      <div className="mb-6 space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="MCPサーバーを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <Suspense fallback={<ServerListSkeleton />}>
        <AsyncServerList
          onCreateServerClick={() => setCreateDialogOpen(true)}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
        />
      </Suspense>
      <CustomMcpServerModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
