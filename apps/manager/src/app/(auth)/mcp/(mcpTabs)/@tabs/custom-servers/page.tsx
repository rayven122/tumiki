"use client";

import { CreateCustomServerButton } from "./_components/CreateCustomServerButton";
import { McpTabs } from "../_components/McpTabs";
import { ServerCardList } from "./ServerCardList";
import { SortConfirmDialog } from "../_components/SortConfirmDialog";
import { SortModeToggleButton } from "../_components/SortModeToggleButton";
import { SortModeNotice } from "../_components/SortModeNotice";
import { useSortModeManager } from "@/hooks/useSortModeManager";

export default function CustomServersPage() {
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
      activeTab="custom-servers"
      addButton={
        <div className="flex items-center">
          <SortModeToggleButton
            isSortMode={isSortMode}
            onToggle={handleSortModeToggle}
          />
          <CreateCustomServerButton />
        </div>
      }
    >
      <SortModeNotice isSortMode={isSortMode} />
      <ServerCardList isSortMode={isSortMode} ref={serverCardListRef} />
      <SortConfirmDialog
        open={showConfirmDialog}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
        hasChanges={serverCardListRef.current?.hasChanges() ?? false}
      />
    </McpTabs>
  );
}
