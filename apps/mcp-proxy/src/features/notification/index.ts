/**
 * エージェント実行通知サービス (CE Facade)
 *
 * Community Edition では Slack 通知機能が無効。
 * EE版との型互換性を維持するため、スタブ実装と型をエクスポートする。
 */

export type AgentExecutionNotifyParams = {
  agentId: string;
  agentName: string;
  organizationId: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  toolNames?: string[];
  chatId?: string;
};

/** CE版では何もしない */
export const notifyAgentExecution = async (
  _params: AgentExecutionNotifyParams,
): Promise<void> => {
  // CE版では通知機能は無効
};
