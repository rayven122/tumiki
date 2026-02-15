import { describe, test, expect } from "vitest";
import {
  AUTO_MODEL_ID,
  analyzeTaskComplexity,
  selectModelByTask,
  isAutoModel,
  type TaskContext,
} from "../auto-model-selector";

describe("auto-model-selector", () => {
  describe("analyzeTaskComplexity", () => {
    test("短いメッセージでツールなしの場合はsimpleを返す", () => {
      const context: TaskContext = {
        messageText: "こんにちは",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };

      expect(analyzeTaskComplexity(context)).toBe("simple");
    });

    test("メッセージ長が100文字未満でも会話が3以上の場合はstandardを返す", () => {
      const context: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 5,
      };

      expect(analyzeTaskComplexity(context)).toBe("standard");
    });

    test("ツールがある場合はstandardを返す", () => {
      const context: TaskContext = {
        messageText: "短いメッセージ",
        mcpToolCount: 2,
        hasAttachments: false,
        conversationLength: 1,
      };

      expect(analyzeTaskComplexity(context)).toBe("standard");
    });

    test("長いメッセージの場合はcomplexを返す", () => {
      const context: TaskContext = {
        messageText: "a".repeat(501),
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };

      expect(analyzeTaskComplexity(context)).toBe("complex");
    });

    test("多数のツールがある場合はcomplexを返す", () => {
      const context: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 6,
        hasAttachments: false,
        conversationLength: 1,
      };

      expect(analyzeTaskComplexity(context)).toBe("complex");
    });

    test("添付ファイルがある場合はcomplexを返す", () => {
      const context: TaskContext = {
        messageText: "画像を分析して",
        mcpToolCount: 0,
        hasAttachments: true,
        conversationLength: 1,
      };

      expect(analyzeTaskComplexity(context)).toBe("complex");
    });

    test("長い会話履歴の場合はcomplexを返す", () => {
      const context: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 11,
      };

      expect(analyzeTaskComplexity(context)).toBe("complex");
    });
  });

  describe("selectModelByTask", () => {
    test("シンプルなタスクの場合はHaikuを返す", () => {
      const context: TaskContext = {
        messageText: "こんにちは",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };

      expect(selectModelByTask(context)).toBe("anthropic/claude-3.5-haiku");
    });

    test("標準的なタスクの場合はSonnet 3.5を返す", () => {
      const context: TaskContext = {
        messageText: "これは中程度の長さのメッセージです。",
        mcpToolCount: 2,
        hasAttachments: false,
        conversationLength: 5,
      };

      expect(selectModelByTask(context)).toBe("anthropic/claude-3.5-sonnet");
    });

    test("複雑なタスクの場合はSonnet 4.5を返す", () => {
      const context: TaskContext = {
        messageText: "a".repeat(501),
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };

      expect(selectModelByTask(context)).toBe("anthropic/claude-sonnet-4.5");
    });
  });

  describe("isAutoModel", () => {
    test("AUTO_MODEL_IDの場合はtrueを返す", () => {
      expect(isAutoModel(AUTO_MODEL_ID)).toBe(true);
    });

    test("通常のモデルIDの場合はfalseを返す", () => {
      expect(isAutoModel("anthropic/claude-3.5-sonnet")).toBe(false);
    });
  });

  describe("AUTO_MODEL_ID", () => {
    test("autoという値を持つ", () => {
      expect(AUTO_MODEL_ID).toBe("auto");
    });
  });
});
