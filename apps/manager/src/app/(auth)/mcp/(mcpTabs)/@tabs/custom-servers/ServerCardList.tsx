"use client";

import { Suspense, useState, useImperativeHandle, forwardRef } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { api } from "@/trpc/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableServerCard } from "./SortableServerCard";

type AsyncServerCardListProps = {
  isSortMode: boolean;
  onSortModeChange: (enabled: boolean) => void;
};

const AsyncServerCardList = forwardRef<
  {
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  },
  AsyncServerCardListProps
>(function AsyncServerCardListComponent(
  { isSortMode, onSortModeChange: _onSortModeChange },
  ref,
) {
  const [userCustomServers] =
    api.userMcpServerInstance.findCustomServers.useSuspenseQuery();
  const [servers, setServers] = useState(userCustomServers);
  const [originalServers, setOriginalServers] = useState(userCustomServers); // 元の順序を保存
  const utils = api.useUtils();
  const updateDisplayOrderMutation =
    api.userMcpServerInstance.updateDisplayOrder.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = servers.findIndex((item) => item.id === active.id);
      const newIndex = servers.findIndex((item) => item.id === over.id);

      // ローカルで即座に並び替え（DB更新はしない）
      const newServers = arrayMove(servers, oldIndex, newIndex);
      setServers(newServers);
    }
  };

  // 変更を確定する関数
  const handleConfirmChanges = async () => {
    const updates = servers.map((server, index) => ({
      id: server.id,
      displayOrder: index,
    }));

    await updateDisplayOrderMutation.mutateAsync({ updates });
    await utils.userMcpServerInstance.findCustomServers.invalidate();
    setOriginalServers(servers); // 新しい順序を元の順序として保存
  };

  // 変更を中止する関数
  const handleCancelChanges = () => {
    setServers(originalServers); // 元の順序に戻す
  };

  // 変更があるかチェック
  const hasChanges = () => {
    return (
      JSON.stringify(servers.map((s) => s.id)) !==
      JSON.stringify(originalServers.map((s) => s.id))
    );
  };

  // refで関数を公開
  useImperativeHandle(ref, () => ({
    handleConfirmChanges,
    handleCancelChanges,
    hasChanges,
  }));

  // サーバーデータが更新されたら反映（ソートモード中でない場合のみ）
  if (
    userCustomServers !== originalServers &&
    userCustomServers.length > 0 &&
    !isSortMode
  ) {
    setServers(userCustomServers);
    setOriginalServers(userCustomServers);
  }

  if (isSortMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={servers} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {servers.map((server) => (
              <SortableServerCard
                key={server.id}
                serverInstance={server}
                isSortMode={isSortMode}
                revalidate={async () =>
                  await utils.userMcpServerInstance.findCustomServers.invalidate()
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // 通常モード
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {servers.map((server) => (
        <SortableServerCard
          key={server.id}
          serverInstance={server}
          isSortMode={isSortMode}
          revalidate={async () =>
            await utils.userMcpServerInstance.findCustomServers.invalidate()
          }
        />
      ))}
    </div>
  );
});

function ServerCardListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <UserMcpServerCardSkeleton key={i} />
      ))}
    </div>
  );
}

type ServerCardListProps = {
  isSortMode: boolean;
  onSortModeChange: (enabled: boolean) => void;
};

export const ServerCardList = forwardRef<
  {
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  },
  ServerCardListProps
>(({ isSortMode, onSortModeChange }, ref) => {
  return (
    <Suspense fallback={<ServerCardListSkeleton />}>
      <AsyncServerCardList
        isSortMode={isSortMode}
        onSortModeChange={onSortModeChange}
        ref={ref}
      />
    </Suspense>
  );
});
