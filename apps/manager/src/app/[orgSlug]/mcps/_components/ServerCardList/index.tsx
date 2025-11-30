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
};

const AsyncServerCardList = forwardRef<
  {
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  },
  AsyncServerCardListProps
>(function AsyncServerCardListComponent({ isSortMode }, ref) {
  const [userOfficialServers] =
    api.v2.userMcpServer.findOfficialServers.useSuspenseQuery();
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
    originalServers: userOfficialServers,
    updateMutation: updateDisplayOrderMutation,
    invalidateQuery: () =>
      utils.v2.userMcpServer.findOfficialServers.invalidate(),
    isSortMode,
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {servers.map((server) => (
              <SortableServerCard
                key={server.id}
                userMcpServer={server}
                isSortMode={isSortMode}
                revalidate={async () =>
                  await utils.v2.userMcpServer.findOfficialServers.invalidate()
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
          userMcpServer={server}
          isSortMode={isSortMode}
          revalidate={async () =>
            await utils.v2.userMcpServer.findOfficialServers.invalidate()
          }
        />
      ))}
    </div>
  );
});

function ServerCardListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

type ServerCardListProps = {
  isSortMode: boolean;
};

export const ServerCardList = forwardRef<
  {
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  },
  ServerCardListProps
>(({ isSortMode }, ref) => {
  return (
    <Suspense fallback={<ServerCardListSkeleton />}>
      <AsyncServerCardList isSortMode={isSortMode} ref={ref} />
    </Suspense>
  );
});
