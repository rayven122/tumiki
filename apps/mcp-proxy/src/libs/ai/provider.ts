import { createOpenAI } from "@ai-sdk/openai";

// Vercel AI Gateway (OpenAI互換API) プロバイダー
export const gateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
  baseURL: "https://ai-gateway.vercel.sh/v1",
});

// Dynamic Search 用モデル
export const DYNAMIC_SEARCH_MODEL = "anthropic/claude-3-5-haiku-latest";
