"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UserMcpServerCard } from "../UserMcpServerCard";
import type { RouterOutputs } from "@/trpc/react";

type UserMcpServer = RouterOutputs["userMcpServer"]["findMcpServers"][number];

type SortableServerCardProps = {
  userMcpServer: UserMcpServer;
  revalidate?: () => Promise<void>;
  isSortMode?: boolean;
};

export const SortableServerCard = ({
  userMcpServer,
  revalidate,
  isSortMode = false,
}: SortableServerCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: userMcpServer.id,
    disabled: !isSortMode, // ソートモードでない時はドラッグ無効
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isSortMode ? (isDragging ? "grabbing" : "grab") : "default",
  };

  // ソートモード時のみドラッグアトリビュートを適用
  const dragProps = isSortMode ? { ...attributes, ...listeners } : {};

  return (
    <div ref={setNodeRef} style={style} {...dragProps} className="w-full">
      <UserMcpServerCard
        userMcpServer={userMcpServer}
        revalidate={revalidate}
        isSortMode={isSortMode}
      />
    </div>
  );
};
