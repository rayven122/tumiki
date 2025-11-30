"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpDown, X, Search } from "lucide-react";
import { useSortModeManager } from "@/hooks/useSortModeManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { api } from "@/trpc/react";

import { ServerCardList } from "./ServerCardList";
import { ServerList } from "../add/_components/ServerList";

type McpsPageClientProps = {
  orgSlug: string;
};

export const McpsPageClient = ({ orgSlug }: McpsPageClientProps) => {
  const {
    isSortMode,
    showConfirmDialog,
    serverCardListRef,
    handleSortModeToggle,
    handleConfirmChanges,
    handleCancelChanges,
  } = useSortModeManager();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // MCPサーバーテンプレート一覧から利用可能なタグを動的に取得
  const { data: mcpServerTemplates } = api.mcpServer.findAll.useQuery();

  // 全MCPサーバーテンプレートからユニークなタグを抽出
  const availableTags = useMemo(() => {
    if (!mcpServerTemplates) return [];
    const allTags = mcpServerTemplates.flatMap((server) => server.tags);
    return Array.from(new Set(allTags)).sort();
  }, [mcpServerTemplates]);

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
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCPサーバー</h1>
        <div className="flex items-center gap-2">
          {/* 並び替えボタン */}
          <Button
            variant={isSortMode ? "destructive" : "outline"}
            size="sm"
            onClick={handleSortModeToggle}
          >
            {isSortMode ? (
              <>
                <X className="mr-2 h-4 w-4" />
                並び替え終了
              </>
            ) : (
              <>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                並び替え
              </>
            )}
          </Button>
          <Link href={`/${orgSlug}/mcps/add`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              MCPサーバーを追加
            </Button>
          </Link>
        </div>
      </div>

      {/* フィルタリングUI */}
      {!isSortMode && (
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
      )}

      {/* MCPサーバー一覧 */}
      <div>
        {/* 並び替えモード通知 */}
        {isSortMode && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              🔄 並び替えモード:
              カードをドラッグして順序を変更できます。他の操作は無効です。
            </p>
          </div>
        )}
        <ServerCardList
          isSortMode={isSortMode}
          ref={serverCardListRef}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
        />
      </div>

      {/* カスタムMCPサーバーを追加セクション */}
      {!isSortMode && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">MCPサーバーを追加</h2>
            <p className="mt-2 text-gray-600">
              MCPサーバーを接続して、さらに多くの機能を利用できます
            </p>
          </div>
          <ServerList
            orgSlug={orgSlug}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            selectedTags={selectedTags}
            onSelectedTagsChange={setSelectedTags}
            showFilteringUI={false}
          />
        </div>
      )}

      {/* 並び替え確認ダイアログ */}
      <AlertDialog open={showConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>並び替えを終了しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {serverCardListRef.current?.hasChanges() ? (
                <>
                  カードの順序を変更しました。
                  <br />
                  変更を保存しますか？それとも破棄しますか？
                </>
              ) : (
                "カードの順序は変更されていません。"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {serverCardListRef.current?.hasChanges() ? (
              <>
                <AlertDialogCancel onClick={handleCancelChanges}>
                  変更を破棄
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmChanges}>
                  変更を保存
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={handleConfirmChanges}>
                終了
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
