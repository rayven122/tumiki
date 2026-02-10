/**
 * システムプロンプト構築ヘルパー
 */

import type { ExecutionTrigger } from "../types.js";

/**
 * トリガー情報を文字列に変換
 */
export const triggerToString = (trigger: ExecutionTrigger): string => {
  switch (trigger.type) {
    case "schedule":
      return `スケジュール実行 (ID: ${trigger.scheduleId})`;
    case "webhook":
      return `Webhook実行 (ID: ${trigger.webhookId})`;
    case "manual":
      return `手動実行 (ユーザー: ${trigger.userId})`;
    case "a2a":
      return `A2A実行 (ソース: ${trigger.sourceAgentId})`;
  }
};

/**
 * システムプロンプトを構築
 *
 * トリガー情報と実行時刻を含むコンテキストを付加する
 */
export const buildSystemPrompt = (
  trigger: ExecutionTrigger,
  customSystemPrompt?: string,
): string => {
  const triggerInfo = triggerToString(trigger);
  const executionContext = `
実行情報:
- トリガー: ${triggerInfo}
- 実行時刻: ${new Date().toISOString()}
`;

  if (customSystemPrompt) {
    return `${customSystemPrompt}\n\n${executionContext}`;
  }

  return `あなたはタスク実行エージェントです。

${executionContext}

与えられたタスクを実行し、結果を報告してください。
エラーが発生した場合は、エラー内容と対処方法を報告してください。`;
};
