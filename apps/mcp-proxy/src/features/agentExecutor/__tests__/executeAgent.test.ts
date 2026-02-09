/**
 * executeAgent テスト
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

import { executeAgent } from "../executeAgent.js";
import type { ExecuteAgentRequest } from "../types.js";

// DBモック用の関数（vi.hoistedで巻き上げ対応）
const {
  mockAgentFindUnique,
  mockExecutionLogCreate,
  mockExecutionLogUpdate,
  mockGenerateText,
} = vi.hoisted(() => ({
  mockAgentFindUnique: vi.fn(),
  mockExecutionLogCreate: vi.fn(),
  mockExecutionLogUpdate: vi.fn(),
  mockGenerateText: vi.fn(),
}));

// @tumiki/db/serverモジュールをモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    agent: {
      findUnique: mockAgentFindUnique,
    },
    agentExecutionLog: {
      create: mockExecutionLogCreate,
      update: mockExecutionLogUpdate,
    },
  },
}));

// gatewayモジュールをモック
vi.mock("../../../infrastructure/ai/index.js", () => ({
  gateway: vi.fn(() => "mocked-model"),
}));

// AIモジュールをモック
vi.mock("ai", () => ({
  generateText: mockGenerateText,
}));

// crypto.randomUUIDをモック
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-1234"),
}));

describe("executeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトでエージェントが見つかるようにモック
    mockAgentFindUnique.mockResolvedValue({
      id: "agent-123",
      systemPrompt: "あなたはテストエージェントです",
      modelId: "anthropic/claude-3-5-sonnet",
      mcpServers: [],
    });
    mockExecutionLogCreate.mockResolvedValue({
      id: "log-1",
      agentId: "agent-123",
      scheduleId: null,
      success: null,
      durationMs: null,
      createdAt: new Date(),
    });
    mockExecutionLogUpdate.mockResolvedValue({
      id: "log-1",
      agentId: "agent-123",
      scheduleId: null,
      success: true,
      durationMs: 100,
      createdAt: new Date(),
    });
  });

  test("スケジュールトリガーでエージェントを正常に実行する", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "タスク完了しました",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "テストタスクを実行",
    };

    const result = await executeAgent(request);

    expect(result).toMatchObject({
      executionId: "test-uuid-1234",
      success: true,
      output: "タスク完了しました",
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  test("手動トリガーでエージェントを正常に実行する", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "手動実行完了",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "manual", userId: "user-789" },
      message: null,
    };

    const result = await executeAgent(request);

    expect(result.success).toBe(true);
    expect(result.output).toBe("手動実行完了");
  });

  test("Webhookトリガーでエージェントを正常に実行する", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Webhook処理完了",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: {
        type: "webhook",
        webhookId: "webhook-001",
        payload: { data: "test" },
      },
      message: "Webhookデータを処理",
    };

    const result = await executeAgent(request);

    expect(result.success).toBe(true);
    expect(result.output).toBe("Webhook処理完了");
  });

  test("A2Aトリガーでエージェントを正常に実行する", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "A2A実行完了",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: {
        type: "a2a",
        sourceAgentId: "source-agent-456",
        message: "別のエージェントからのメッセージ",
      },
      message: "タスクを実行",
    };

    const result = await executeAgent(request);

    expect(result.success).toBe(true);
    expect(result.output).toBe("A2A実行完了");
  });

  test("エージェントが見つからない場合はエラー結果を返す", async () => {
    mockAgentFindUnique.mockResolvedValueOnce(null);

    const request: ExecuteAgentRequest = {
      agentId: "non-existent-agent",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "テストタスク",
    };

    const result = await executeAgent(request);

    expect(result).toMatchObject({
      executionId: "test-uuid-1234",
      success: false,
      output: "",
      error: "Agent not found: non-existent-agent",
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("LLM呼び出しが失敗した場合はエラー結果を返す", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("API Error"));

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "テストタスク",
    };

    const result = await executeAgent(request);

    expect(result).toMatchObject({
      executionId: "test-uuid-1234",
      success: false,
      output: "",
      error: "API Error",
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("messageがnullの場合はデフォルトメッセージを使用する", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "デフォルトタスク完了",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: null,
    };

    await executeAgent(request);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "定期実行タスクを開始してください。",
      }),
    );
  });

  test("実行ログがDBに保存される", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "タスク完了",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "テストタスク",
    };

    await executeAgent(request);

    expect(mockExecutionLogCreate).toHaveBeenCalledWith({
      data: {
        agentId: "agent-123",
        scheduleId: "schedule-456",
        modelId: "anthropic/claude-3-5-sonnet",
        success: null,
        durationMs: null,
      },
    });
    expect(mockExecutionLogUpdate).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: {
        success: true,
        durationMs: expect.any(Number) as number,
      },
    });
  });

  test("エージェントのカスタムシステムプロンプトが使用される", async () => {
    mockAgentFindUnique.mockResolvedValueOnce({
      id: "agent-123",
      systemPrompt: "カスタムプロンプト: データ分析を行ってください",
      modelId: "anthropic/claude-3-5-sonnet",
      mcpServers: [],
    });

    mockGenerateText.mockResolvedValueOnce({
      text: "分析完了",
    });

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "分析を開始",
    };

    await executeAgent(request);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          "カスタムプロンプト: データ分析を行ってください",
        ) as string,
      }),
    );
  });
});
