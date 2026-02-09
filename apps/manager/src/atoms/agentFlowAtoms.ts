import { atom, useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { McpServerVisibility } from "@tumiki/db/prisma";

/**
 * エージェント作成フローの状態型
 */
export type AgentFlowState = {
  // 現在のステップ番号 (1-3)
  currentStep: number;
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
  currentStep: 1,
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
      // currentStepのバリデーション
      if (
        updates.currentStep !== undefined &&
        (updates.currentStep < 1 || updates.currentStep > 3)
      ) {
        console.warn("Invalid step number:", updates.currentStep);
        return;
      }
      setFlowState((prev) => ({ ...prev, ...updates }));
    },
    [setFlowState],
  );

  const resetFlowState = useCallback(() => {
    setFlowState(initialState);
  }, [setFlowState]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= 3) {
        setFlowState((prev) => ({ ...prev, currentStep: step }));
      }
    },
    [setFlowState],
  );

  const nextStep = useCallback(() => {
    setFlowState((prev) => {
      if (prev.currentStep < 3) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, [setFlowState]);

  const prevStep = useCallback(() => {
    setFlowState((prev) => {
      if (prev.currentStep > 1) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, [setFlowState]);

  // 基本情報が入力されているか（ステップ1のバリデーション、作成可否にも使用）
  const isBasicInfoValid = useMemo(
    () =>
      flowState.name.trim().length > 0 &&
      flowState.systemPrompt.trim().length > 0,
    [flowState.name, flowState.systemPrompt],
  );

  return {
    flowState,
    updateFlowState,
    resetFlowState,
    goToStep,
    nextStep,
    prevStep,
    isBasicInfoValid,
  };
};
