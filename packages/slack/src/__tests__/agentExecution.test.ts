import { describe, expect, test } from "vitest";

import type { SlackBotMessage } from "../botClient.js";
import type { AgentExecutionNotificationData } from "../templates/agentExecution.js";
import { makeAgentExecutionSlackMessage } from "../templates/agentExecution.js";

/**
 * ブロック内に指定テキストを含むセクションがあるか確認
 */
const hasSectionWithText = (result: SlackBotMessage, text: string): boolean => {
  return (
    result.blocks?.some(
      (block) =>
        block &&
        "text" in block &&
        block.text &&
        typeof block.text === "object" &&
        "text" in block.text &&
        typeof block.text.text === "string" &&
        block.text.text.includes(text),
    ) ?? false
  );
};

/**
 * ステータスと実行時間のセクション（3番目のブロック）を取得
 */
const getStatusSection = (result: SlackBotMessage) => result.blocks?.[2];

describe("makeAgentExecutionSlackMessage", () => {
  const baseData: AgentExecutionNotificationData = {
    agentName: "テストエージェント",
    success: true,
    durationMs: 1500,
    channelId: "C1234567890",
  };

  describe("成功時のメッセージ", () => {
    test("成功メッセージを生成する", () => {
      const result = makeAgentExecutionSlackMessage(baseData);

      expect(result.channel).toBe("C1234567890");
      expect(result.text).toBe(
        ":white_check_mark: エージェント実行成功: テストエージェント",
      );
      expect(result.blocks).toBeDefined();

      // ヘッダーブロックの検証
      const headerBlock = result.blocks?.[0];
      expect(headerBlock).toStrictEqual({
        type: "header",
        text: {
          type: "plain_text",
          text: ":white_check_mark: エージェント実行成功: テストエージェント",
          emoji: true,
        },
      });

      // dividerブロックの検証
      expect(result.blocks?.[1]).toStrictEqual({ type: "divider" });

      // ステータスと実行時間のセクション検証
      expect(getStatusSection(result)).toStrictEqual({
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*ステータス*\n成功" },
          { type: "mrkdwn", text: "*実行時間*\n1.5秒" },
        ],
      });
    });
  });

  describe("失敗時のメッセージ", () => {
    test("失敗メッセージを生成する", () => {
      const failureData: AgentExecutionNotificationData = {
        ...baseData,
        success: false,
        errorMessage: "接続タイムアウト",
      };

      const result = makeAgentExecutionSlackMessage(failureData);

      expect(result.text).toBe(":x: エージェント実行失敗: テストエージェント");

      // ヘッダーブロック
      expect(result.blocks?.[0]).toStrictEqual({
        type: "header",
        text: {
          type: "plain_text",
          text: ":x: エージェント実行失敗: テストエージェント",
          emoji: true,
        },
      });

      // ステータスセクション
      expect(getStatusSection(result)).toStrictEqual({
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*ステータス*\n失敗" },
          { type: "mrkdwn", text: "*実行時間*\n1.5秒" },
        ],
      });

      // エラーメッセージセクション
      const errorSection = result.blocks?.[3];
      expect(errorSection).toStrictEqual({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*エラー内容*\n```接続タイムアウト```",
        },
      });
    });

    test("失敗時にerrorMessageがない場合はエラーセクションを含まない", () => {
      const failureDataWithoutError: AgentExecutionNotificationData = {
        ...baseData,
        success: false,
      };

      const result = makeAgentExecutionSlackMessage(failureDataWithoutError);

      expect(hasSectionWithText(result, "エラー内容")).toBe(false);
    });
  });

  describe("実行時間のフォーマット", () => {
    test("1秒未満の場合はミリ秒で表示する", () => {
      const data: AgentExecutionNotificationData = {
        ...baseData,
        durationMs: 500,
      };

      const result = makeAgentExecutionSlackMessage(data);

      expect(getStatusSection(result)).toStrictEqual({
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*ステータス*\n成功" },
          { type: "mrkdwn", text: "*実行時間*\n500ms" },
        ],
      });
    });

    test("1秒以上の場合は秒で表示する", () => {
      const data: AgentExecutionNotificationData = {
        ...baseData,
        durationMs: 2500,
      };

      const result = makeAgentExecutionSlackMessage(data);

      expect(getStatusSection(result)).toStrictEqual({
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*ステータス*\n成功" },
          { type: "mrkdwn", text: "*実行時間*\n2.5秒" },
        ],
      });
    });

    test("ちょうど1秒の場合は秒で表示する", () => {
      const data: AgentExecutionNotificationData = {
        ...baseData,
        durationMs: 1000,
      };

      const result = makeAgentExecutionSlackMessage(data);

      expect(getStatusSection(result)).toStrictEqual({
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*ステータス*\n成功" },
          { type: "mrkdwn", text: "*実行時間*\n1.0秒" },
        ],
      });
    });
  });

  describe("ツール名リスト", () => {
    test("ツール名リストがある場合は表示する", () => {
      const data: AgentExecutionNotificationData = {
        ...baseData,
        toolNames: ["search", "write_file", "execute_command"],
      };

      const result = makeAgentExecutionSlackMessage(data);

      // divider + toolsセクションを確認
      const dividerIndex = result.blocks?.findIndex(
        (block, index) => index > 2 && block && block.type === "divider",
      );
      expect(dividerIndex).toBeGreaterThan(2);

      const toolsSection = result.blocks?.[dividerIndex! + 1];
      expect(toolsSection).toStrictEqual({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*使用ツール*\nsearch, write_file, execute_command",
        },
      });
    });

    test("ツール名リストが空の場合は表示しない", () => {
      const data: AgentExecutionNotificationData = {
        ...baseData,
        toolNames: [],
      };

      const result = makeAgentExecutionSlackMessage(data);

      expect(hasSectionWithText(result, "使用ツール")).toBe(false);
    });

    test("ツール名リストがundefinedの場合は表示しない", () => {
      const result = makeAgentExecutionSlackMessage(baseData);

      expect(hasSectionWithText(result, "使用ツール")).toBe(false);
    });
  });

  describe("詳細URL", () => {
    test("詳細URLがある場合はリンクを表示する", () => {
      const data: AgentExecutionNotificationData = {
        ...baseData,
        detailUrl: "https://app.tumiki.io/agents/executions/chat-123",
      };

      const result = makeAgentExecutionSlackMessage(data);

      const contextBlock = result.blocks?.find(
        (block) => block && block.type === "context",
      );
      expect(contextBlock).toStrictEqual({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "<https://app.tumiki.io/agents/executions/chat-123|:link: 詳細を確認>",
          },
        ],
      });
    });

    test("詳細URLがない場合はリンクを表示しない", () => {
      const result = makeAgentExecutionSlackMessage(baseData);

      const hasContextBlock = result.blocks?.some(
        (block) => block && block.type === "context",
      );
      expect(hasContextBlock).toBe(false);
    });
  });

  describe("複合ケース", () => {
    test("すべてのオプションを含むメッセージを生成する", () => {
      const fullData: AgentExecutionNotificationData = {
        agentName: "完全テストエージェント",
        success: true,
        durationMs: 3500,
        toolNames: ["tool1", "tool2"],
        detailUrl: "https://app.tumiki.io/executions/123",
        channelId: "C9876543210",
      };

      const result = makeAgentExecutionSlackMessage(fullData);

      expect(result.channel).toBe("C9876543210");
      expect(result.text).toBe(
        ":white_check_mark: エージェント実行成功: 完全テストエージェント",
      );

      // ブロック数の検証: header, divider, section, divider, tools, context = 6
      expect(result.blocks?.length).toBe(6);
    });

    test("失敗時にすべてのオプションを含むメッセージを生成する", () => {
      const fullFailureData: AgentExecutionNotificationData = {
        agentName: "失敗テストエージェント",
        success: false,
        durationMs: 5000,
        errorMessage: "認証エラー",
        toolNames: ["auth_tool"],
        detailUrl: "https://app.tumiki.io/executions/456",
        channelId: "C1111111111",
      };

      const result = makeAgentExecutionSlackMessage(fullFailureData);

      expect(result.text).toBe(
        ":x: エージェント実行失敗: 失敗テストエージェント",
      );

      // ブロック数の検証: header, divider, section, error, divider, tools, context = 7
      expect(result.blocks?.length).toBe(7);
    });
  });
});
