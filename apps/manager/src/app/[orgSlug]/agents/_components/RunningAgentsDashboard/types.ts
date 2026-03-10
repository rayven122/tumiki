/** 実行データの型定義 */
export type ExecutionData = {
  id: string;
  chatId: string | null;
  agentName: string;
  agentIconPath: string | null;
  estimatedDurationMs: number;
  createdAt: Date;
};
