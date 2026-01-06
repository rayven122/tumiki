import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { xai } from "@ai-sdk/xai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from "./models.mock";

// マルチプロバイダー対応のAIモデル設定
// 各プロバイダーのAPIキーは環境変数で設定:
// - XAI_API_KEY
// - ANTHROPIC_API_KEY
// - OPENAI_API_KEY
// - GOOGLE_GENERATIVE_AI_API_KEY
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        // テスト環境用モック
        // xAI
        "grok-4-fast": chatModel,
        "grok-4-reasoning": reasoningModel,
        "grok-4-vision": chatModel,
        "grok-3-mini": chatModel,
        // Anthropic
        "claude-sonnet-4": chatModel,
        "claude-opus-4": chatModel,
        "claude-haiku-3.5": chatModel,
        // OpenAI
        "gpt-4o": chatModel,
        "gpt-4o-mini": chatModel,
        o1: reasoningModel,
        "o3-mini": reasoningModel,
        // Google
        "gemini-2.0-flash": chatModel,
        "gemini-2.5-pro": chatModel,
        "gemini-2.5-flash": chatModel,
        // 内部用
        "title-model": titleModel,
        "artifact-model": artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // ========== xAI (Grok) ==========
        "grok-4-fast": xai("grok-4-1-fast-non-reasoning"),
        "grok-4-reasoning": wrapLanguageModel({
          model: xai("grok-4-1-fast-reasoning"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "grok-4-vision": xai("grok-2-vision-1212"),
        "grok-3-mini": xai("grok-3-mini-beta"),

        // ========== Anthropic (Claude) ==========
        "claude-sonnet-4": anthropic("claude-sonnet-4-20250514"),
        "claude-opus-4": anthropic("claude-opus-4-20250514"),
        "claude-haiku-3.5": anthropic("claude-3-5-haiku-20241022"),

        // ========== OpenAI ==========
        "gpt-4o": openai("gpt-4o"),
        "gpt-4o-mini": openai("gpt-4o-mini"),
        o1: wrapLanguageModel({
          model: openai("o1"),
          middleware: extractReasoningMiddleware({ tagName: "thinking" }),
        }),
        "o3-mini": wrapLanguageModel({
          model: openai("o3-mini"),
          middleware: extractReasoningMiddleware({ tagName: "thinking" }),
        }),

        // ========== Google (Gemini) ==========
        "gemini-2.0-flash": google("gemini-2.0-flash"),
        "gemini-2.5-pro": google("gemini-2.5-pro-preview-06-05"),
        "gemini-2.5-flash": google("gemini-2.5-flash-preview-05-20"),

        // ========== 内部用モデル ==========
        "title-model": xai("grok-3-mini-beta"),
        "artifact-model": xai("grok-3-mini-beta"),
      },
      imageModels: {
        "small-model": xai.image("grok-2-image"),
      },
    });
