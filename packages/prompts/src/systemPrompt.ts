/**
 * システムプロンプト組み立て
 *
 * ペルソナ + 指示 + 動的情報を結合してシステムプロンプトを生成する
 */

import type {
  PromptSection,
  SystemPromptOptions,
  SystemPromptResult,
} from "./types.js";
import { getArtifactsPrompt } from "./instructions.js";
import { getMcpToolsPrompt } from "./mcpToolsPrompt.js";
import { loadPersona } from "./personas.js";
import { getRequestPromptFromHints } from "./requestHints.js";

/**
 * 推論モデルかどうかを判定
 */
const isReasoningModel = (modelId: string): boolean =>
  modelId.includes("reasoning") || modelId.endsWith("-thinking");

/**
 * システムプロンプトを組み立てる
 *
 * 構造:
 * 1. ペルソナ        <- personas/{personaId}.md または personaContent
 * 2. Artifacts 指示  <- instructions/artifacts.md（推論モデルでは省略）
 * 3. MCP ツール指示  <- 動的生成（ツールがある場合のみ）
 * 4. 位置情報        <- 動的生成（ある場合のみ）
 */
export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  mcpToolNames = [],
  personaId,
  personaContent,
}: SystemPromptOptions): SystemPromptResult => {
  // personaContent が指定されていればそのまま使い、なければビルトインを引く
  const resolvedPersonaContent =
    personaContent ?? loadPersona(personaId).content;
  const reasoning = isReasoningModel(selectedChatModel);

  // 各セクションを key 付きで構築（空セクションは除外）
  const sections: PromptSection[] = [
    { key: "persona", content: resolvedPersonaContent },
    { key: "artifacts", content: reasoning ? "" : getArtifactsPrompt() },
    { key: "mcpTools", content: getMcpToolsPrompt(mcpToolNames) },
    {
      key: "requestHints",
      content: requestHints ? getRequestPromptFromHints(requestHints) : "",
    },
  ].filter((s) => s.content);

  return {
    prompt: sections.map((s) => s.content).join("\n\n"),
    sections,
  };
};
