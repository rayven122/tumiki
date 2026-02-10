/**
 * ストリーム消費ヘルパー
 */

import type { streamText } from "ai";

import type { StreamTextResult } from "./buildMessageParts.js";

/**
 * ストリームを消費してテキストとステップ情報を収集
 */
export const consumeStream = async (
  streamResult: Awaited<ReturnType<typeof streamText>>,
): Promise<StreamTextResult> => {
  // ストリームを消費してテキストを収集
  let text = "";

  for await (const part of streamResult.fullStream) {
    if (part.type === "text-delta") {
      text += part.text;
    }
  }

  // stepsプロパティから詳細情報を取得
  const rawSteps = await streamResult.steps;
  const steps: StreamTextResult["steps"] = rawSteps.map((step) => ({
    toolCalls: step.toolCalls.map(({ toolCallId, toolName, input }) => ({
      toolCallId,
      toolName,
      // AI SDKのtool inputは動的型のためunknownとして扱う
      input: input as unknown,
    })),
    toolResults: step.toolResults.map(({ toolCallId, output }) => ({
      toolCallId,
      // AI SDKのtool outputは動的型のためunknownとして扱う
      output: output as unknown,
    })),
  }));

  return {
    text,
    steps: steps.length > 0 ? steps : undefined,
  };
};
