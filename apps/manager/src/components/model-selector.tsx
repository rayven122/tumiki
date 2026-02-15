"use client";

import type { SessionData } from "~/auth";
import { BaseModelSelector } from "./base-model-selector";

type ModelSelectorProps = {
  session: SessionData;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

/**
 * 2段階階層のモデルセレクター（フルサイズ版）
 *
 * - 「自動（推奨）」: タスクに応じて最適なモデルを自動選択
 * - プロバイダー別サブメニュー: 手動でモデルを選択
 */
export const ModelSelector = ({
  session: _session,
  selectedModelId,
  onModelChange,
  className,
}: ModelSelectorProps) => {
  return (
    <BaseModelSelector
      selectedModelId={selectedModelId}
      onModelChange={onModelChange}
      className={className}
      variant="default"
    />
  );
};
