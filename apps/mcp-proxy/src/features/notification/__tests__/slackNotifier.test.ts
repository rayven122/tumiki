import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  AgentNotificationConfig,
  OrganizationSlackConfig,
} from "../../../infrastructure/db/repositories/index.js";
import {
  notifyAgentExecution,
  type AgentExecutionNotifyParams,
  type SlackNotificationResult,
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
  isSlackApiError: (error: unknown): boolean => {
    // SlackApiErrorかどうかを判定（テスト用に簡易実装）
    return (
      error instanceof Error &&
      "code" in error &&
      typeof (error as { code: string }).code === "string"
    );
  },
}));

// logger をモック
const mockLogInfo = vi.fn();
const mockLogError = vi.fn();
const mockLogWarn = vi.fn();

vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: (message: string, metadata?: unknown): void => {
    mockLogInfo(message, metadata);
  },
  logError: (message: string, error: Error, metadata?: unknown): void => {
    mockLogError(message, error, metadata);
  },
  logWarn: (message: string, metadata?: unknown): void => {
    mockLogWarn(message, metadata);
  },
}));

// repository をモック
const mockGetAgentNotificationConfig = vi.fn();
const mockGetOrganizationSlackConfig = vi.fn();

vi.mock("../../../infrastructure/db/repositories/index.js", () => ({
  getAgentNotificationConfig: (
    agentId: string,
  ): Promise<AgentNotificationConfig | null> =>
    Promise.resolve(mockGetAgentNotificationConfig(agentId)),
  getOrganizationSlackConfig: (
    organizationId: string,
  ): Promise<OrganizationSlackConfig | null> =>
    Promise.resolve(mockGetOrganizationSlackConfig(organizationId)),
}));

// crypto はprisma-field-encryptionで自動復号化されるためモック不要

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

  // prisma-field-encryptionで自動復号化されたトークン
  const slackBotToken = "xoxb-test-bot-token";
  const orgSlug = "@test-org";

  beforeEach(() => {
    vi.stubEnv("MANAGER_BASE_URL", "https://app.tumiki.io");
    vi.clearAllMocks();
    mockMakeAgentExecutionSlackMessage.mockReturnValue({
      channel: "C1234567890",
      text: "テストメッセージ",
      blocks: [],
    });
    mockSendSlackBotMessage.mockResolvedValue({ ok: true });
    // デフォルトで組織のSlack設定を返す（prisma-field-encryptionで自動復号化済み）
    mockGetOrganizationSlackConfig.mockReturnValue({
      slug: orgSlug,
      slackBotToken,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("正常系", () => {
    test("通知設定が有効な場合にSlack通知を送信する", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: true,
        success: true,
      });
      expect(mockGetAgentNotificationConfig).toHaveBeenCalledWith("agent-123");
      expect(mockGetOrganizationSlackConfig).toHaveBeenCalledWith("org-456");
      // prisma-field-encryptionで自動復号化されるため、decrypt呼び出しの検証は不要
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
        { botToken: slackBotToken },
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
          detailUrl: `https://app.tumiki.io/${orgSlug}/chat/chat-789`,
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

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: false,
        success: false,
      });
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

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: false,
        success: false,
      });
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

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: false,
        success: false,
      });
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

      const result = await notifyAgentExecution({
        ...baseParams,
        success: true,
      });

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: false,
        success: false,
      });
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

      const result = await notifyAgentExecution({
        ...baseParams,
        success: false,
      });

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: true,
        success: true,
      });
      expect(mockSendSlackBotMessage).toHaveBeenCalled();
    });

    test("Slack Bot Tokenが未設定の場合はスキップする", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);
      mockGetOrganizationSlackConfig.mockReturnValue({
        slug: orgSlug,
        slackBotToken: null,
      });

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: false,
        success: false,
      });
      expect(mockLogInfo).toHaveBeenCalledWith(
        "Slack bot token not configured",
        { organizationId: "org-456" },
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();
    });

    test("組織が見つからない場合はスキップする", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);
      mockGetOrganizationSlackConfig.mockReturnValue(null);

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: false,
        success: false,
      });
      expect(mockLogInfo).toHaveBeenCalledWith(
        "Slack bot token not configured",
        { organizationId: "org-456" },
      );
      expect(mockSendSlackBotMessage).not.toHaveBeenCalled();
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
          detailUrl: `https://app.tumiki.io/${orgSlug}/chat/chat-abc`,
        }),
      );
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
          detailUrl: `https://custom.example.com/${orgSlug}/chat/chat-xyz`,
        }),
      );
    });
  });

  describe("エラーハンドリング", () => {
    test("通知送信エラーが発生しても例外をスローしない", async () => {
      mockGetAgentNotificationConfig.mockReturnValue(enabledConfig);
      mockSendSlackBotMessage.mockRejectedValue(
        new Error("Slack API error: channel_not_found"),
      );

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: true,
        success: false,
        errorCode: "unknown",
        errorMessage: "Slack API error: channel_not_found",
      });
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

      const result = await notifyAgentExecution(baseParams);

      expect(result).toStrictEqual<SlackNotificationResult>({
        attempted: true,
        success: false,
        errorCode: "unknown",
        errorMessage: "Database connection error",
      });
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
