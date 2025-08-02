"use client";

import { McpTabs } from "../_components/McpTabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SortModeToggleButton } from "../_components/SortModeToggleButton";
import { SortModeNotice } from "../_components/SortModeNotice";
import { useSortModeManager } from "@/hooks/useSortModeManager";

import { ServerCardList } from "./ServerCardList";
import { AvailableServersList } from "./AvailableServersList";
import { SortConfirmDialog } from "../_components/SortConfirmDialog";

export default function ServersPage() {
  const {
    isSortMode,
    showConfirmDialog,
    serverCardListRef,
    handleSortModeToggle,
    handleConfirmChanges,
    handleCancelChanges,
  } = useSortModeManager();

  return (
    <McpTabs
      activeTab="servers"
      addButton={
        <div className="flex items-center">
          <SortModeToggleButton
            isSortMode={isSortMode}
            onToggle={handleSortModeToggle}
          />
          <Link href="/mcp/servers/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              MCPサーバーを追加
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* 追加済みMCPサーバー一覧 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">接続済みMCPサーバー</h2>
          <SortModeNotice isSortMode={isSortMode} />
          <ServerCardList isSortMode={isSortMode} ref={serverCardListRef} />
        </div>

        {/* 追加可能なMCPサーバー一覧 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">追加可能なMCPサーバー</h2>
          <AvailableServersList />
        </div>
      </div>
      <SortConfirmDialog
        open={showConfirmDialog}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
        hasChanges={serverCardListRef.current?.hasChanges() ?? false}
      />
    </McpTabs>
  );
}
