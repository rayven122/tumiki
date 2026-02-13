import type { RouterOutputs } from "@/trpc/react";
import type { DragEndEvent } from "@dnd-kit/core";

export type UserMcpServer =
  RouterOutputs["userMcpServer"]["findMcpServers"][number];

export type SortableServerHookReturn = {
  servers: UserMcpServer[];
  handleDragEnd: (event: DragEndEvent) => void;
  handleConfirmChanges: () => Promise<void>;
  handleCancelChanges: () => void;
  hasChanges: () => boolean;
};

export type SortableServerHookParams = {
  originalServers: UserMcpServer[];
  updateMutation: {
    mutateAsync: (params: {
      updates: { id: string; displayOrder: number }[];
    }) => Promise<{ success: boolean }>;
  };
  invalidateQuery: () => Promise<void>;
  isSortMode: boolean;
};

export type ServerCardListRef = {
  handleConfirmChanges: () => Promise<void>;
  handleCancelChanges: () => void;
  hasChanges: () => boolean;
};
