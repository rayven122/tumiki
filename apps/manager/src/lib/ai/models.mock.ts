import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import type {
  LanguageModelV3FinishReason,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import { getResponseChunksByPrompt } from "@/tests/prompts/utils";

// v3用の使用量情報
const mockUsage: LanguageModelV3Usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

// v3用のfinishReason
const finishReasonStop: LanguageModelV3FinishReason = {
  unified: "stop",
  raw: undefined,
};

export const chatModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ type: "text", text: "Hello, world!" }],
    finishReason: finishReasonStop,
    usage: mockUsage,
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});

export const reasoningModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ type: "text", text: "Hello, world!" }],
    finishReason: finishReasonStop,
    usage: mockUsage,
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
  }),
});

export const titleModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ type: "text", text: "This is a test title" }],
    finishReason: finishReasonStop,
    usage: mockUsage,
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "This is a test title" },
        { type: "text-end", id: "text-1" },
        {
          type: "finish",
          finishReason: finishReasonStop,
          usage: mockUsage,
        },
      ] satisfies LanguageModelV3StreamPart[],
    }),
  }),
});

export const artifactModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ type: "text", text: "Hello, world!" }],
    finishReason: finishReasonStop,
    usage: mockUsage,
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});
