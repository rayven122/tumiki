"use client";

import type { UIArtifact } from "@/components/artifact";

/**
 * アーティファクトの初期データ
 */
export const initialArtifactData: UIArtifact = {
  id: "",
  documentId: "",
  title: "",
  kind: "text",
  content: "",
  status: "idle",
  isVisible: false,
};

/**
 * アーティファクト状態を管理するフック（スタブ実装）
 */
export const useArtifact = () => {
  return {
    artifact: initialArtifactData,
    setArtifact: (
      _artifact: UIArtifact | ((prev: UIArtifact) => UIArtifact),
    ) => {
      // スタブ実装: 何もしない
    },
    metadata: {},
    setMetadata: (_metadata: unknown) => {
      // スタブ実装: 何もしない
    },
  };
};

/**
 * アーティファクト状態のセレクター（スタブ実装）
 */
export const useArtifactSelector = <T>(
  selector: (artifact: UIArtifact) => T,
): T => {
  return selector(initialArtifactData);
};
