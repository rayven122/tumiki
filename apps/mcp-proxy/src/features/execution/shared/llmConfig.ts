/**
 * LLM呼び出し共通設定
 *
 * chat と agentExecutor で共有するLLM設定ビルダー
 */

import type { Tool } from "ai";

import { gateway } from "../../../infrastructure/ai/index.js";

/**
 * 推論モデルかどうかを判定
 *
 * 推論モデル（Claude reasoning, OpenAI o1等）は thinking 機能を使用し、
 * ツール呼び出しを無効化する必要がある
 *
 * @param modelId - Vercel AI Gateway 形式のモデルID
 * @returns 推論モデルの場合 true
 */
export const isReasoningModel = (modelId: string): boolean =>
  modelId.includes("reasoning") || modelId.endsWith("-thinking");

/**
 * streamText 設定オプション
 */
export type LLMConfigOptions = {
  /** Vercel AI Gateway 形式のモデルID */
  modelId: string;
  /** システムプロンプト */
  systemPrompt: string;
  /** MCPツール名の配列（experimental_activeTools用） */
  mcpToolNames: string[];
  /** MCPツールオブジェクト */
  mcpTools: Record<string, Tool>;
  /** AbortSignal（タイムアウト用） */
  abortSignal?: AbortSignal;
};

/**
 * Anthropic thinking設定の型
 */
type AnthropicThinkingConfig = {
  anthropic: {
    thinking: { type: "enabled"; budgetTokens: number };
  };
};

/**
 * streamText 共通設定のレスポンス型
 */
export type StreamTextConfig = {
  model: ReturnType<typeof gateway.languageModel>;
  system: string;
  abortSignal?: AbortSignal;
  experimental_activeTools: string[];
  providerOptions: AnthropicThinkingConfig | undefined;
  tools: Record<string, Tool> | undefined;
};

/**
 * streamText 用の共通設定を構築
 *
 * チャットとエージェント実行で共通のLLM呼び出し設定を生成する。
 * 推論モデルの場合はツールを無効化し、thinking を有効化する。
 *
 * @param options - 設定オプション
 * @returns streamText に渡す設定オブジェクト
 */
export const buildStreamTextConfig = (
  options: LLMConfigOptions,
): StreamTextConfig => {
  const reasoning = isReasoningModel(options.modelId);
  const hasMcpTools = Object.keys(options.mcpTools).length > 0;

  return {
    model: gateway.languageModel(options.modelId),
    system: options.systemPrompt,
    abortSignal: options.abortSignal,
    // 推論モデルはツールを使用しない
    experimental_activeTools: reasoning ? [] : options.mcpToolNames,
    // 推論モデルは thinking を有効化
    providerOptions: reasoning
      ? {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 10_000 },
          },
        }
      : undefined,
    // MCPツールがある場合のみtools設定
    tools: hasMcpTools ? options.mcpTools : undefined,
  };
};
