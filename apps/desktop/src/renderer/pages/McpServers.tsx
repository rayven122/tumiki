import React, { useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import { mcpServersAtom } from "../store/atoms";
import { MCP_CATALOG_ITEMS } from "../constants/mcpCatalog";
import { CatalogCard } from "../_components/CatalogCard";
import { IntegrateMcpTab } from "../_components/IntegrateMcpTab";
import { Plus, Layers, Search, X } from "lucide-react";
import { clsx } from "clsx";

const EmptyState = (): React.ReactElement => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
      <div className="mb-4 text-6xl">📦</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        MCPを接続しましょう
      </h3>
      <p className="mb-4 max-w-md text-center text-sm text-gray-600">
        AIエージェントを強化するMCPを追加して、
        <br />
        様々なツールを利用できます
      </p>
      <p className="text-sm text-gray-500">↓ 下のテンプレートから選んで追加</p>
    </div>
  );
};

export const McpServers = (): React.ReactElement => {
  const servers = useAtomValue(mcpServersAtom);
  const [activeTab, setActiveTab] = useState<"add" | "integrate">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 全カタログからユニークなタグを抽出
  const availableTags = useMemo(() => {
    const allTags = MCP_CATALOG_ITEMS.flatMap((item) => item.tags);
    return Array.from(new Set(allTags)).sort();
  }, []);

  // フィルタリング
  const filteredItems = useMemo(() => {
    return MCP_CATALOG_ITEMS.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => item.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [searchQuery, selectedTags]);

  const toggleTag = (tag: string): void => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearAllFilters = (): void => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <h2 className="text-2xl font-bold text-gray-900">MCP</h2>

      {/* 空状態（サーバー未登録時） */}
      {servers.length === 0 && <EmptyState />}

      {/* フィルタリングUI（サーバー登録済みの場合） */}
      {servers.length > 0 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="MCPを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                カテゴリーで絞り込み
              </h3>
              {(searchQuery || selectedTags.length > 0) && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  フィルターをクリア
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "border-purple-600 bg-purple-600 text-white hover:bg-purple-700"
                      : "border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  {tag}
                  {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {(searchQuery || selectedTags.length > 0) && (
            <div className="text-sm text-gray-600">
              {searchQuery && <span>検索: &quot;{searchQuery}&quot; </span>}
              {selectedTags.length > 0 && (
                <span>カテゴリー: {selectedTags.join(", ")}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* MCPを追加 / MCPを統合 タブセクション */}
      <section className="mt-8">
        {/* タブ */}
        <div className="mb-4 grid w-full grid-cols-2 rounded-lg border border-gray-200 bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "add"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            <Plus className="h-4 w-4" />
            MCPを追加
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("integrate")}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "integrate"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            <Layers className="h-4 w-4" />
            MCPを統合
          </button>
        </div>

        {/* タブコンテンツ */}
        {activeTab === "add" && (
          <div>
            <p className="mb-4 text-sm text-gray-600">
              テンプレートから選んで新しいMCPを接続
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
              {/* カスタムMCP追加カード */}
              <button
                type="button"
                className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-purple-400 hover:bg-purple-50"
              >
                <Plus className="mb-2 h-12 w-12 text-gray-400" />
                <p className="text-center text-sm font-medium text-gray-600">
                  カスタムMCPを追加
                </p>
              </button>

              {filteredItems.map((item) => (
                <CatalogCard key={item.id} item={item} />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <p className="text-sm text-gray-600">
                  条件に一致するMCPサーバーが見つかりません
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  フィルターをクリア
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "integrate" && <IntegrateMcpTab />}
      </section>
    </div>
  );
};
