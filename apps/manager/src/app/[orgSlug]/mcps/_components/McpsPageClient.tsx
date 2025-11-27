"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSortModeManager } from "@/hooks/useSortModeManager";

import { ServerCardList } from "./ServerCardList";
import { AvailableServersList } from "./AvailableServersList";
import { SortModeToggleButton } from "./SortModeToggleButton";
import { SortModeNotice } from "./SortModeNotice";
import { SortConfirmDialog } from "./SortConfirmDialog";

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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCPサーバー</h1>
        <div className="flex items-center gap-2">
          <SortModeToggleButton
            isSortMode={isSortMode}
            onToggle={handleSortModeToggle}
          />
          <Link href={`/${orgSlug}/mcps/add`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              MCPサーバーを追加
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        {/* 接続済みMCPサーバー一覧 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">接続済みMCPサーバー</h2>
          <SortModeNotice isSortMode={isSortMode} />
          <ServerCardList isSortMode={isSortMode} ref={serverCardListRef} />
        </div>

        {/* 追加可能なMCPサーバー一覧 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">追加可能なMCPサーバー</h2>
          <AvailableServersList orgSlug={orgSlug} />
        </div>
      </div>

      <SortConfirmDialog
        open={showConfirmDialog}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
        hasChanges={serverCardListRef.current?.hasChanges() ?? false}
      />
    </div>
  );
};
