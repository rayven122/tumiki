import { atomWithSessionStorage } from "@/lib/atomWithSessionStorage";

// 統合フロー状態の型定義
export type IntegratedFlowState = {
  selectedTemplateIds: string[];
  toolSelections: Record<string, string[]>; // templateId -> toolIds[]（Record形式でJSON化可能）
  envVars: Record<string, Record<string, string>>; // templateId -> { key: value }
  serverName: string;
  serverDescription: string;
  currentStep: number;
};

// sessionStorageと同期するatom（OAuth認証中も状態保持）
export const integratedFlowStateAtom =
  atomWithSessionStorage<IntegratedFlowState>("tumiki_integrated_flow", {
    selectedTemplateIds: [],
    toolSelections: {},
    envVars: {},
    serverName: "",
    serverDescription: "",
    currentStep: 1,
  });
