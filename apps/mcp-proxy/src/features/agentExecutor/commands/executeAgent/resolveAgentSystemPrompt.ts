/**
 * エージェント用システムプロンプト解決ヘルパー
 *
 * ペルソナIDからペルソナ内容を読み込み、systemPromptと結合する
 */

import { loadPersona } from "@tumiki/prompts";

/**
 * ペルソナとsystemPromptを結合してシステムプロンプトを生成する
 *
 * @param systemPrompt - エージェントのカスタムシステムプロンプト
 * @param personaId - ペルソナID（null = ペルソナなし）
 * @returns 結合されたプロンプト、またはundefined
 */
export const resolveAgentSystemPrompt = (
  systemPrompt: string | null,
  personaId: string | null,
): string | undefined => {
  const personaContent = personaId ? loadPersona(personaId).content : undefined;

  if (personaContent && systemPrompt) {
    return `${personaContent}\n\n${systemPrompt}`;
  }

  if (personaContent) {
    return personaContent;
  }

  return systemPrompt ?? undefined;
};
