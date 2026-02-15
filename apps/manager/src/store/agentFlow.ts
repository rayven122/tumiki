import { atom, useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { McpServerVisibility } from "@tumiki/db/prisma";

/**
 * エージェント作成フローの状態型
 */
export type AgentFlowState = {
  // 基本情報
  name: string;
  systemPrompt: string;
  modelId: string;
  iconPath: string;
  // MCPサーバー選択
  selectedMcpServerIds: string[];
  // 可視性
  visibility: McpServerVisibility;
};

// 初期状態
const initialState: AgentFlowState = {
  name: "",
  systemPrompt: "",
  modelId: "",
  iconPath: "",
  selectedMcpServerIds: [],
  visibility: McpServerVisibility.ORGANIZATION,
};

// エージェント作成フローのatom
const agentFlowAtom = atom<AgentFlowState>(initialState);

/**
 * エージェント作成フローの状態を管理するカスタムフック
 */
export const useAgentFlow = () => {
  const [flowState, setFlowState] = useAtom(agentFlowAtom);

  const updateFlowState = useCallback(
    (updates: Partial<AgentFlowState>) => {
      setFlowState((prev) => ({ ...prev, ...updates }));
    },
    [setFlowState],
  );

  const resetFlowState = useCallback(() => {
    setFlowState(initialState);
  }, [setFlowState]);

  // 基本情報が入力されているか（作成可否の判定に使用）
  const isBasicInfoValid = useMemo(
    () => flowState.name.trim() !== "" && flowState.systemPrompt.trim() !== "",
    [flowState.name, flowState.systemPrompt],
  );

  return {
    flowState,
    updateFlowState,
    resetFlowState,
    isBasicInfoValid,
  };
};
