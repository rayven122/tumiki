import type { RouterOutputs } from "@/trpc/react";
import type { DragEndEvent } from "@dnd-kit/core";

export type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findCustomServers"][number];

export type SortableServerHookReturn = {
  servers: ServerInstance[];
  handleDragEnd: (event: DragEndEvent) => void;
  handleConfirmChanges: () => Promise<void>;
  handleCancelChanges: () => void;
  hasChanges: () => boolean;
};

export type SortableServerHookParams = {
  originalServers: ServerInstance[];
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
