"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";

import {
  chatModels,
  DEFAULT_CHAT_MODEL,
  getModelsGroupedByProvider,
  entitlementsByUserType,
} from "@/features/chat/services/ai/index.client";
import { AUTO_MODEL_ID } from "@/features/chat/services/ai/auto-model-selector";

type UseModelSelectorProps = {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
};

/**
 * モデルセレクターの共通ロジックを提供するカスタムフック
 *
 * - プロバイダー別にグループ化されたモデルリスト
 * - 選択中モデルの表示名
 * - 自動選択状態の判定
 * - モデル選択ハンドラ
 */
export const useModelSelector = ({
  selectedModelId,
  onModelChange,
}: UseModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const { availableChatModelIds } = entitlementsByUserType.regular;

  // プロバイダー別にグループ化されたモデル（利用可能なものだけフィルタ）
  const groupedModels = useMemo(() => {
    const groups = getModelsGroupedByProvider();
    return groups
      .map((group) => ({
        ...group,
        models: group.models.filter((model) =>
          availableChatModelIds.includes(model.id),
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [availableChatModelIds]);

  // 選択されたモデルの表示名を取得
  const selectedDisplayName = useMemo(() => {
    // 自動選択の場合
    if (optimisticModelId === AUTO_MODEL_ID) {
      return "自動";
    }

    // 通常のモデルの場合
    const found = chatModels.find(
      (chatModel) =>
        chatModel.id === optimisticModelId &&
        availableChatModelIds.includes(chatModel.id),
    );
    if (found) return found.name;

    // フォールバック: デフォルトモデル名を返す
    const defaultModel = chatModels.find(
      (chatModel) => chatModel.id === DEFAULT_CHAT_MODEL,
    );
    return defaultModel?.name ?? "モデル選択";
  }, [optimisticModelId, availableChatModelIds]);

  // モデル選択ハンドラ
  const handleSelectModel = (modelId: string) => {
    setOpen(false);
    startTransition(() => {
      setOptimisticModelId(modelId);
      onModelChange?.(modelId);
    });
  };

  // 自動選択かどうか
  const isAutoSelected = optimisticModelId === AUTO_MODEL_ID;

  return {
    open,
    setOpen,
    optimisticModelId,
    groupedModels,
    selectedDisplayName,
    handleSelectModel,
    isAutoSelected,
  };
};
