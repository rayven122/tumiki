"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  X,
  Search,
  ChevronDown,
  Plus,
  Layers,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { cn } from "@/lib/utils";
import { ServerType } from "@tumiki/db/prisma";

import { ServerCardList } from "./ServerCardList";
import { ServerList } from "../add/_components/ServerList";
import { EmptyState } from "./EmptyState";
import { IntegrateMcpModal } from "./IntegrateMcpModal";

type McpsPageClientProps = {
  orgSlug: string;
};

export const McpsPageClient = ({ orgSlug }: McpsPageClientProps) => {
  const { data: session } = useSession();
  const isAdmin = getSessionInfo(session).isAdmin;

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
  const [isIntegrateModalOpen, setIsIntegrateModalOpen] = useState(false);

  // 登録済みサーバー数を取得
  const { data: userServers } = api.v2.userMcpServer.findMcpServers.useQuery();
  const serverCount = userServers?.length ?? 0;

  // 統合対象のOFFICIALサーバーをフィルタリング
  const officialServers = useMemo(
    () =>
      userServers?.filter(
        (server) => server.serverType === ServerType.OFFICIAL,
      ) ?? [],
    [userServers],
  );
  const officialServerCount = officialServers.length;

  // テンプレート一覧の展開状態（サーバー0件時は展開、1件以上は折りたたみ）
  const [isTemplateListOpen, setIsTemplateListOpen] = useState(
    serverCount === 0,
  );

  // MCPサーバーテンプレート一覧から利用可能なタグを動的に取得
  const { data: mcpServerTemplates } = api.v2.mcpServer.findAll.useQuery();

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
        <h1 className="text-2xl font-bold">MCP</h1>
        {serverCount > 0 && (
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
          </div>
        )}
      </div>

      {/* フィルタリングUI */}
      {!isSortMode && serverCount > 0 && (
        <div className="mb-6 space-y-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="MCPを検索..."
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
              {searchQuery && <span>検索: &quot;{searchQuery}&quot; </span>}
              {selectedTags.length > 0 && (
                <span>カテゴリー: {selectedTags.join(", ")}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* MCPサーバー一覧または空状態 */}
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

        {/* サーバー0件時は空状態を表示、1件以上は一覧を表示 */}
        {serverCount === 0 ? (
          <EmptyState />
        ) : (
          <ServerCardList
            isSortMode={isSortMode}
            ref={serverCardListRef}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
          />
        )}
      </div>

      {/* MCPサーバー操作セクション（管理者・オーナーのみ表示） */}
      {!isSortMode && isAdmin && (
        <div className="mt-12 space-y-8">
          {/* MCPを追加セクション */}
          <section>
            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Plus className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">MCPを追加</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              テンプレートから選んで新しいMCPを接続
            </p>
            <Collapsible
              open={isTemplateListOpen || serverCount === 0}
              onOpenChange={setIsTemplateListOpen}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100">
                <span className="font-medium text-gray-700">
                  テンプレート一覧
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-gray-500 transition-transform duration-200",
                    (isTemplateListOpen || serverCount === 0) && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ServerList
                  orgSlug={orgSlug}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedTags={selectedTags}
                  onSelectedTagsChange={setSelectedTags}
                  showFilteringUI={false}
                />
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* MCPを統合セクション - OFFICIALサーバーが2件以上時のみ表示 */}
          {officialServerCount >= 2 && (
            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <Layers className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  MCPを統合
                </h2>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                登録済みの{officialServerCount}つのMCPを1つにまとめて管理
              </p>
              <button
                type="button"
                onClick={() => setIsIntegrateModalOpen(true)}
                className="group flex w-full items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                    <Layers className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      統合MCPを作成
                    </span>
                    <p className="text-xs text-gray-600">
                      複数MCPのツールを1つのMCPとして利用
                    </p>
                  </div>
                </div>
              </button>
              <IntegrateMcpModal
                open={isIntegrateModalOpen}
                onOpenChange={setIsIntegrateModalOpen}
                userServers={officialServers}
              />
            </section>
          )}
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
