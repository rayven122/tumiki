import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import type { AgentNotificationConfig } from "../../../infrastructure/db/repositories/index.js";
import {
  notifyAgentExecution,
  type AgentExecutionNotifyParams,
} from "../slackNotifier.js";

// @tumiki/slack をモック
const mockSendSlackBotMessage = vi.fn();
const mockMakeAgentExecutionSlackMessage = vi.fn();

vi.mock("@tumiki/slack", () => ({
  sendSlackBotMessage: (
    config: { botToken: string },
    message: { channel: string; text: string },
  ): Promise<{ ok: boolean }> =>
    mockSendSlackBotMessage(config, message) as Promise<{ ok: boolean }>,
  makeAgentExecutionSlackMessage: (data: unknown): unknown =>
    mockMakeAgentExecutionSlackMessage(data) as unknown,
}));

// logger をモック
const mockLogInfo = vi.fn();
const mockLogError = vi.fn();

vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: (message: string, metadata?: unknown): void => {
    mockLogInfo(message, metadata);
  },
  logError: (message: string, error: Error, metadata?: unknown): void => {
    mockLogError(message, error, metadata);
  },
}));

// repository をモック
const mockGetAgentNotificationConfig = vi.fn();

vi.mock("../../../infrastructure/db/repositories/index.js", () => ({
  getAgentNotificationConfig: (
    agentId: string,
  ): Promise<AgentNotificationConfig | null> =>
    Promise.resolve(mockGetAgentNotificationConfig(agentId)),
}));

// toError をモック
vi.mock("../../../shared/errors/toError.js", () => ({
  toError: (error: unknown): Error =>
    error instanceof Error ? error : new Error(String(error)),
}));

describe("notifyAgentExecution", () => {
  const baseParams: AgentExecutionNotifyParams = {
    agentId: "agent-123",
    agentName: "テストエージェント",
    organizationId: "org-456",
    success: true,
    durationMs: 1500,
  };

  const enabledConfig: AgentNotificationConfig = {
    enableSlackNotification: true,
    slackNotificationChannelId: "C1234567890",
    notifyOnlyOnFailure: false,
  };

  beforeAll(() => {
    vi.stubEnv("SLACK_BOT_TOKEN", "xoxb-test-bot-token");
    vi.stubEnv("MANAGER_BASE_URL", "https://app.tumiki.io");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockMakeAgentExecutionSlackMessage.mockReturnValue({
      channel: "C1234567890",
      text: "テストメッセージ",
      blocks: [],
    });
    mockSendSlackBotMessage.mockResolvedValue({ ok: true });
  });

  describe("正常系", () => {
    test("通知設定が有効な場合にSlack通知を送信する", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution(baseParams);

      expect(mockGetAgentNotificationConfig).toHaveBeenCalledWith("agent-123");
      expect(mockMakeAgentExecutionSlackMessage).toHaveBeenCalledWith({
        agentName: "テストエージェント",
        success: true,
        durationMs: 1500,
        errorMessage: undefined,
        toolNames: undefined,
        detailUrl: undefined,
        channelId: "C1234567890",
      });
      expect(mockSendSlackBotMessage).toHaveBeenCalledWith(
        { botToken: "xoxb-test-bot-token" },
        { channel: "C1234567890", text: "テストメッセージ", blocks: [] },
      );
      expect(mockLogInfo).toHaveBeenCalledWith(
        "Slack notification sent successfully",
        {
          agentId: "agent-123",
          success: true,
          channelId: "C1234567890",
        },
      );
    });

    test("chatIdがある場合は詳細URLを含める", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution({
        ...baseParams,
        chatId: "chat-789",
      });

      expect(mockMakeAgentExecutionSlackMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          detailUrl: "https://app.tumiki.io/agents/executions/chat-789",
        }),
      );
    });

    test("toolNamesがある場合は含める", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution({
        ...baseParams,
        toolNames: ["tool1", "tool2"],
      });

      expect(mockMakeAgentExecutionSlackMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          toolNames: ["tool1", "tool2"],
        }),
      );
    });

    test("errorMessageがある場合は含める", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution({
        ...baseParams,
        success: false,
        errorMessage: "エラーが発生しました",
      });

      expect(mockMakeAgentExecutionSlackMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: "エラーが発生しました",
        }),
      );
    });
  });

  describe("通知スキップ条件", () => {
    test("エージェントが見つからない場合は通知をスキップする", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(null);

      await notifyAgentExecution(baseParams);

      expect(mockLogInfo).toHaveBeenCalledWith(
        "Agent not found for notification",
        { agentId: "agent-123" },
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();
    });

    test("通知が無効な場合はスキップする", async () => {
      mockGetAgentNotificationConfig.mockReturnValue({
        ...enabledConfig,
        enableSlackNotification: false,
      });

      await notifyAgentExecution(baseParams);

      expect(mockLogInfo).toHaveBeenCalledWith(
        "Notification skipped based on config",
        expect.objectContaining({
          agentId: "agent-123",
          enableSlackNotification: false,
        }),
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();
    });

    test("チャンネルIDが未設定の場合はスキップする", async () => {
      mockGetAgentNotificationConfig.mockReturnValue({
        ...enabledConfig,
        slackNotificationChannelId: null,
      });

      await notifyAgentExecution(baseParams);

      expect(mockLogInfo).toHaveBeenCalledWith(
        "Notification skipped based on config",
        expect.objectContaining({ agentId: "agent-123" }),
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();
    });

    test("失敗時のみ通知設定で成功の場合はスキップする", async () => {
      mockGetAgentNotificationConfig.mockReturnValue({
        ...enabledConfig,
        notifyOnlyOnFailure: true,
      });

      await notifyAgentExecution({ ...baseParams, success: true });

      expect(mockLogInfo).toHaveBeenCalledWith(
        "Notification skipped based on config",
        expect.objectContaining({
          agentId: "agent-123",
          notifyOnlyOnFailure: true,
          success: true,
        }),
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();
    });

    test("失敗時のみ通知設定で失敗の場合は通知する", async () => {
      mockGetAgentNotificationConfig.mockReturnValue({
        ...enabledConfig,
        notifyOnlyOnFailure: true,
      });

      await notifyAgentExecution({ ...baseParams, success: false });

      expect(mockSendSlackBotMessage).toHaveBeenCalled();
    });

    test("Slack Bot Tokenが未設定の場合はスキップする", async () => {
      vi.stubEnv("SLACK_BOT_TOKEN", "");
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution(baseParams);

      expect(mockLogInfo).toHaveBeenCalledWith(
        "Slack bot token not configured",
        { organizationId: "org-456" },
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();

      // 元に戻す
      vi.stubEnv("SLACK_BOT_TOKEN", "xoxb-test-bot-token");
    });
  });

  describe("環境変数", () => {
    test("MANAGER_BASE_URLが未設定の場合はデフォルトURLを使用する", async () => {
      // undefinedをスタブするとデフォルト値が使用される
      vi.stubEnv("MANAGER_BASE_URL", undefined as unknown as string);
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution({
        ...baseParams,
        chatId: "chat-abc",
      });

      expect(mockMakeAgentExecutionSlackMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          detailUrl: "https://app.tumiki.io/agents/executions/chat-abc",
        }),
      );

      // 元に戻す
      vi.stubEnv("MANAGER_BASE_URL", "https://app.tumiki.io");
    });

    test("カスタムMANAGER_BASE_URLが設定されている場合はそれを使用する", async () => {
      vi.stubEnv("MANAGER_BASE_URL", "https://custom.example.com");
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      await notifyAgentExecution({
        ...baseParams,
        chatId: "chat-xyz",
      });

      expect(mockMakeAgentExecutionSlackMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          detailUrl: "https://custom.example.com/agents/executions/chat-xyz",
        }),
      );

      // 元に戻す
      vi.stubEnv("MANAGER_BASE_URL", "https://app.tumiki.io");
    });
  });

  describe("エラーハンドリング", () => {
    test("通知送信エラーが発生しても例外をスローしない", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);
      mockSendSlackBotMessage.mockRejectedValue(
        new Error("Slack API error: channel_not_found"),
      );

      await expect(notifyAgentExecution(baseParams)).resolves.not.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        "Failed to send Slack notification",
        expect.any(Error),
        {
          agentId: "agent-123",
          organizationId: "org-456",
        },
      );
    });

    test("設定取得エラーが発生しても例外をスローしない", async () => {
      mockGetAgentNotificationConfig.mockImplementation(() => {
        throw new Error("Database connection error");
      });

      await expect(notifyAgentExecution(baseParams)).resolves.not.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        "Failed to send Slack notification",
        expect.any(Error),
        {
          agentId: "agent-123",
          organizationId: "org-456",
        },
      );
    });
  });
});
