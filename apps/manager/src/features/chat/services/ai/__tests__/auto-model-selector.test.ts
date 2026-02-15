import { describe, test, expect } from "vitest";
import {
  AUTO_MODEL_ID,
  analyzeTaskComplexity,
  selectModelByTask,
  isAutoModel,
  detectTaskType,
  calculateComplexityScore,
  type TaskContext,
} from "../auto-model-selector";

describe("auto-model-selector", () => {
  describe("detectTaskType", () => {
    test("コード関連のキーワードを含む場合はcodeを返す", () => {
      expect(detectTaskType("このコードをデバッグして")).toBe("code");
      expect(detectTaskType("APIの実装をお願いします")).toBe("code");
      expect(detectTaskType("```typescript\nconst x = 1;\n```")).toBe("code");
    });

    test("分析関連のキーワードを含む場合はanalysisを返す", () => {
      expect(detectTaskType("このデータを分析して")).toBe("analysis");
      expect(detectTaskType("2つの方法を比較してください")).toBe("analysis");
      expect(detectTaskType("レポートをまとめて")).toBe("analysis");
    });

    test("クリエイティブ関連のキーワードを含む場合はcreativeを返す", () => {
      expect(detectTaskType("ブログ記事を作成して")).toBe("creative");
      expect(detectTaskType("アイデアを提案してください")).toBe("creative");
    });

    test("質問形式の場合はquestionを返す", () => {
      expect(detectTaskType("これはなんですか？")).toBe("question");
      expect(detectTaskType("どうすればいいですか")).toBe("question");
      expect(detectTaskType("What is this?")).toBe("question");
    });

    test("該当しない場合はgeneralを返す", () => {
      expect(detectTaskType("こんにちは")).toBe("general");
      expect(detectTaskType("ありがとう")).toBe("general");
    });

    test("コードキーワードは他のタイプより優先される", () => {
      // コード + 質問 の場合はコードが優先
      expect(detectTaskType("このバグの原因は何ですか？")).toBe("code");
    });
  });

  describe("calculateComplexityScore", () => {
    test("シンプルな質問は低スコアを返す", () => {
      const context: TaskContext = {
        messageText: "こんにちは",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      const score = calculateComplexityScore(context);
      expect(score).toBeLessThanOrEqual(1);
    });

    test("コードタスクは基本スコアが高い", () => {
      const context: TaskContext = {
        messageText: "このコードをレビューして",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      const score = calculateComplexityScore(context);
      expect(score).toBeGreaterThanOrEqual(2);
    });

    test("長いメッセージはスコアが高くなる", () => {
      const shortContext: TaskContext = {
        messageText: "短いメッセージ",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      const longContext: TaskContext = {
        messageText: "a".repeat(600),
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      expect(calculateComplexityScore(longContext)).toBeGreaterThan(
        calculateComplexityScore(shortContext),
      );
    });

    test("ツールが多いとスコアが高くなる", () => {
      const noToolContext: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      const manyToolContext: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 8,
        hasAttachments: false,
        conversationLength: 1,
      };
      expect(calculateComplexityScore(manyToolContext)).toBeGreaterThan(
        calculateComplexityScore(noToolContext),
      );
    });

    test("添付ファイルがあるとスコアが上がる", () => {
      const noAttachmentContext: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      const withAttachmentContext: TaskContext = {
        messageText: "テスト",
        mcpToolCount: 0,
        hasAttachments: true,
        conversationLength: 1,
      };
      expect(calculateComplexityScore(withAttachmentContext)).toBeGreaterThan(
        calculateComplexityScore(noAttachmentContext),
      );
    });
  });

  describe("analyzeTaskComplexity", () => {
    test("シンプルな挨拶はsimpleを返す", () => {
      const context: TaskContext = {
        messageText: "こんにちは",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      expect(analyzeTaskComplexity(context)).toBe("simple");
    });

    test("短い質問はsimpleを返す", () => {
      const context: TaskContext = {
        messageText: "今日の天気は？",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      expect(analyzeTaskComplexity(context)).toBe("simple");
    });

    test("コードレビュー依頼はstandardを返す", () => {
      const context: TaskContext = {
        messageText: "このコードをレビューして",
        mcpToolCount: 0,
        hasAttachments: false,
        conversationLength: 1,
      };
      expect(analyzeTaskComplexity(context)).toBe("standard");
    });

    test("長いコード分析タスクはcomplexを返す", () => {
      const context: TaskContext = {
        messageText:
          "このコードを分析して、パフォーマンスの問題点と改善案を詳しく説明してください。" +
          "a".repeat(500),
        mcpToolCount: 5,
        hasAttachments: false,
        conversationLength: 5,
      };
      expect(analyzeTaskComplexity(context)).toBe("complex");
    });

    test("添付ファイル付きはcomplexになりやすい", () => {
      const context: TaskContext = {
        messageText: "この画像を分析して",
        mcpToolCount: 0,
        hasAttachments: true,
        conversationLength: 1,
      };
      // 分析(2) + 添付(2) = 4 → standard
      // または分析によりcomplex
      const complexity = analyzeTaskComplexity(context);
      expect(["standard", "complex"]).toContain(complexity);
    });

    test("多数のツールを使用する場合はcomplexを返す", () => {
      const context: TaskContext = {
        messageText: "データを取得して分析してレポートを作成して",
        mcpToolCount: 10,
        hasAttachments: false,
        conversationLength: 1,
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
        messageText: "このコードを確認して",
        mcpToolCount: 2,
        hasAttachments: false,
        conversationLength: 3,
      };
      expect(selectModelByTask(context)).toBe("anthropic/claude-3.5-sonnet");
    });

    test("複雑なタスクの場合はSonnet 4.5を返す", () => {
      const context: TaskContext = {
        messageText:
          "このコードベース全体をリファクタリングして、パフォーマンスを最適化し、テストカバレッジを100%にしてください。" +
          "a".repeat(500),
        mcpToolCount: 8,
        hasAttachments: true,
        conversationLength: 15,
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
