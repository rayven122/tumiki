"use client";

import { Suspense, useImperativeHandle, forwardRef } from "react";
import { api } from "@/trpc/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableServerCard } from "./SortableServerCard";
import { useSortableServers } from "@/hooks/useSortableServers";

type AsyncServerCardListProps = {
  isSortMode: boolean;
  searchQuery: string;
  selectedTags: string[];
};

const AsyncServerCardList = forwardRef<
  {
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  },
  AsyncServerCardListProps
>(function AsyncServerCardListComponent(
  { isSortMode, searchQuery, selectedTags },
  ref,
) {
  const [userMcpServers] =
    api.v2.userMcpServer.findMcpServers.useSuspenseQuery();
  const utils = api.useUtils();
  const updateDisplayOrderMutation =
    api.v2.userMcpServer.updateDisplayOrder.useMutation();

  const {
    servers,
    handleDragEnd,
    handleConfirmChanges,
    handleCancelChanges,
    hasChanges,
  } = useSortableServers({
    originalServers: userMcpServers,
    updateMutation: updateDisplayOrderMutation,
    invalidateQuery: () => utils.v2.userMcpServer.findMcpServers.invalidate(),
    isSortMode,
  });

  // フィルタリング
  const filteredServers = servers.filter((server) => {
    // 検索クエリでのフィルタリング
    const matchesSearch = server.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // タグでのフィルタリング
    const firstInstance = server.templateInstances[0];
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some(
        (tag) => firstInstance?.mcpServerTemplate?.tags.includes(tag) ?? false,
      );

    return matchesSearch && matchesTags;
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // refで関数を公開
  useImperativeHandle(ref, () => ({
    handleConfirmChanges,
    handleCancelChanges,
    hasChanges,
  }));

  if (isSortMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={servers} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-6">
            {servers.map((server) => (
              <div key={server.id} className="flex w-full sm:w-[300px]">
                <SortableServerCard
                  userMcpServer={server}
                  isSortMode={isSortMode}
                  revalidate={async () =>
                    await utils.v2.userMcpServer.findMcpServers.invalidate()
                  }
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // 通常モード（フィルタリング適用）

  // サーバーが1つも接続されていない場合
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
        <div className="mb-4 text-6xl">📦</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          接続済みMCPサーバーがありません
        </h3>
        <p className="mb-4 text-center text-sm text-gray-600">
          下の「MCPサーバーを追加」セクションからサーバーを接続してください
        </p>
      </div>
    );
  }

  // フィルタリング結果が0件の場合
  if (filteredServers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
        <div className="mb-4 text-6xl">🔍</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          該当するMCPサーバーが見つかりません
        </h3>
        <p className="mb-4 text-center text-sm text-gray-600">
          検索条件やカテゴリーを変更してみてください
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6">
      {filteredServers.map((server) => (
        <div key={server.id} className="flex w-full sm:w-[300px]">
          <SortableServerCard
            userMcpServer={server}
            isSortMode={isSortMode}
            revalidate={async () =>
              await utils.v2.userMcpServer.findMcpServers.invalidate()
            }
          />
        </div>
      ))}
    </div>
  );
});

function ServerCardListSkeleton() {
  return (
    <div className="flex flex-wrap gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-64 w-full animate-pulse rounded-lg bg-gray-200 sm:w-[300px]"
        />
      ))}
    </div>
  );
}

type ServerCardListProps = {
  isSortMode: boolean;
  searchQuery: string;
  selectedTags: string[];
};

export const ServerCardList = forwardRef<
  {
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  },
  ServerCardListProps
>(({ isSortMode, searchQuery, selectedTags }, ref) => {
  return (
    <Suspense fallback={<ServerCardListSkeleton />}>
      <AsyncServerCardList
        isSortMode={isSortMode}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        ref={ref}
      />
    </Suspense>
  );
});
