import { atom } from "jotai";

/**
 * 統合サーバー作成フロー状態の型定義
 *
 * 用語マッピング:
 * - serviceTemplate (McpServerTemplate): サービステンプレート - 全ユーザー共通のカタログ
 * - connectionConfig (McpServerTemplateInstance): 接続設定 - ユーザーが認証情報を設定したインスタンス
 * - integratedServer (McpServer): 統合サーバー - 複数の接続設定を束ねて公開するサーバー
 *
 * 注: このフローでは既存の設定済み接続設定（connectionConfig）のみを選択可能
 * OAuth認証フローは不要（既に設定済み）のため、sessionStorageでの状態保持は不要
 */
export type IntegratedFlowState = {
  // 選択された接続設定（McpServerTemplateInstance）のID配列
  selectedInstanceIds: string[];
  // 接続設定IDごとのツール選択状態（instanceId -> toolIds[]）
  toolSelections: Record<string, string[]>;
  // 統合サーバー名
  serverName: string;
  // 統合サーバー説明
  serverDescription: string;
  // 現在のステップ番号
  currentStep: number;
};

// 通常のJotai atom（sessionStorageは不要）
export const integratedFlowStateAtom = atom<IntegratedFlowState>({
  selectedInstanceIds: [],
  toolSelections: {},
  serverName: "",
  serverDescription: "",
  currentStep: 1,
});
