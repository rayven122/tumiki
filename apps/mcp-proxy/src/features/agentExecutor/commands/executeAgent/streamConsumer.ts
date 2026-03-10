/**
 * ストリーム消費ヘルパー
 */

import type { JSONValue, streamText } from "ai";

import type { StreamTextResult } from "./buildMessageParts.js";

/**
 * ストリームを消費してテキストとステップ情報を収集
 */
export const consumeStreamText = async (
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
      // AI SDKのtool inputはJSON形式であるためJSONValueにキャスト
      input: input as JSONValue,
    })),
    toolResults: step.toolResults.map(({ toolCallId, output }) => ({
      toolCallId,
      // AI SDKのtool outputはJSON形式であるためJSONValueにキャスト
      output: output as JSONValue,
    })),
  }));

  return {
    text,
    steps: steps.length > 0 ? steps : undefined,
  };
};
