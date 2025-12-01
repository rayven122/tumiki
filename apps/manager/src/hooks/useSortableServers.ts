import { useState, useEffect } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type {
  UserMcpServer,
  SortableServerHookReturn,
  SortableServerHookParams,
} from "@/types/sort";

export const useSortableServers = ({
  originalServers,
  updateMutation,
  invalidateQuery,
  isSortMode,
}: SortableServerHookParams): SortableServerHookReturn => {
  const [servers, setServers] = useState<UserMcpServer[]>(originalServers);
  const [originalServerOrder, setOriginalServerOrder] =
    useState<UserMcpServer[]>(originalServers);

  // 元のサーバーデータが更新されたら反映（ソートモード中でない場合のみ）
  useEffect(() => {
    if (
      originalServers !== originalServerOrder &&
      originalServers.length > 0 &&
      !isSortMode
    ) {
      setServers(originalServers);
      setOriginalServerOrder(originalServers);
    }
  }, [originalServers, originalServerOrder, isSortMode]);

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

    await updateMutation.mutateAsync({ updates });
    await invalidateQuery();
    setOriginalServerOrder(servers); // 新しい順序を元の順序として保存
  };

  // 変更を中止する関数
  const handleCancelChanges = () => {
    setServers(originalServerOrder); // 元の順序に戻す
  };

  // 変更があるかチェック
  const hasChanges = () => {
    return (
      JSON.stringify(servers.map((s) => s.id)) !==
      JSON.stringify(originalServerOrder.map((s) => s.id))
    );
  };

  return {
    servers,
    handleDragEnd,
    handleConfirmChanges,
    handleCancelChanges,
    hasChanges,
  };
};
