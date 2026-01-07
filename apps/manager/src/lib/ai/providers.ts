import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// 推論モデル識別用の正規表現（-thinking サフィックス）
const THINKING_SUFFIX_REGEX = /-thinking$/;

// テスト環境用のモックプロバイダー
export const myProvider = isTestEnvironment
  ? (() => {
      const { artifactModel, chatModel, reasoningModel, titleModel } =
        require("./models.mock") as typeof import("./models.mock");
      return customProvider({
        languageModels: {
          // テスト環境用モック - Gateway形式のIDを使用
          // Anthropic
          "anthropic/claude-haiku-4.5": chatModel,
          "anthropic/claude-sonnet-4": chatModel,
          "anthropic/claude-opus-4.5": chatModel,
          // OpenAI
          "openai/gpt-4o-mini": chatModel,
          "openai/gpt-4o": chatModel,
          // Google
          "google/gemini-2.0-flash": chatModel,
          "google/gemini-2.5-pro-preview": chatModel,
          "google/gemini-2.5-flash-preview": chatModel,
          // xAI
          "xai/grok-4-fast": chatModel,
          // Reasoning models
          "anthropic/claude-sonnet-4-thinking": reasoningModel,
          "xai/grok-4-reasoning": reasoningModel,
          // 内部用
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

/**
 * モデルIDからLanguageModelを取得
 * Vercel AI Gateway を使用して各プロバイダーにルーティング
 *
 * 環境変数: AI_GATEWAY_API_KEY
 */
export function getLanguageModel(modelId: string) {
  // テスト環境ではモックを使用
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // 推論モデル（-thinking サフィックス）かどうかを判定
  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    // -thinking サフィックスを除去してGatewayモデルIDを取得
    const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: gateway.languageModel(gatewayModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return gateway.languageModel(modelId);
}

/**
 * タイトル生成用モデルを取得
 * コスト効率の良い軽量モデルを使用
 */
export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return gateway.languageModel("anthropic/claude-haiku-4.5");
}

/**
 * アーティファクト生成用モデルを取得
 */
export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return gateway.languageModel("anthropic/claude-haiku-4.5");
}
