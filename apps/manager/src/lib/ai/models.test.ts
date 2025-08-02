import { describe, test, expect } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV1 } from "ai/test";
import { getResponseChunksByPrompt } from "@/tests/prompts/utils";

export const chatModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

export const reasoningModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

export const titleModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `This is a test title`,
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: [
        { type: "text-delta", textDelta: "This is a test title" },
        {
          type: "finish",
          finishReason: "stop",
          logprobs: undefined,
          usage: { completionTokens: 10, promptTokens: 3 },
        },
      ],
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

export const artifactModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

describe("Mock AI Models", () => {
  describe("chatModel", () => {
    test("チャットモデルのdoGenerate関数が正しく動作する", async () => {
      const result = await chatModel.doGenerate({
        abortSignal: new AbortController().signal,
        inputFormat: "prompt",
        mode: { type: "regular" },
        prompt: [],
      });

      expect(result.text).toBe("Hello, world!");
      expect(result.finishReason).toBe("stop");
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(20);
    });
  });

  describe("titleModel", () => {
    test("タイトルモデルのdoGenerate関数が正しく動作する", async () => {
      const result = await titleModel.doGenerate({
        abortSignal: new AbortController().signal,
        inputFormat: "prompt",
        mode: { type: "regular" },
        prompt: [],
      });

      expect(result.text).toBe("This is a test title");
      expect(result.finishReason).toBe("stop");
    });
  });
});
