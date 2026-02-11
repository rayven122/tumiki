/**
 * executeAgent テスト
 */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeEach, describe, expect, test, vi } from "vitest";

import { executeAgent } from "../commands/index.js";
import type { ExecuteAgentRequest } from "../types.js";

// DBモック用の関数（vi.hoistedで巻き上げ対応）
const {
  mockAgentFindUnique,
  mockExecutionLogCreate,
  mockStreamText,
  mockGetChatMcpTools,
} = vi.hoisted(() => ({
  mockAgentFindUnique: vi.fn(),
  mockExecutionLogCreate: vi.fn(),
  mockStreamText: vi.fn(),
  mockGetChatMcpTools: vi.fn(),
}));

// トランザクション用モック
const mockTransaction = vi.hoisted(() => vi.fn());
const mockChatCreate = vi.hoisted(() => vi.fn());
const mockMessageCreate = vi.hoisted(() => vi.fn());
const mockExecutionLogUpdateTx = vi.hoisted(() => vi.fn());

// ログ更新用モック（新しい実装用）
const mockExecutionLogUpdate = vi.hoisted(() => vi.fn());
const mockAgentUpdate = vi.hoisted(() => vi.fn());

// @tumiki/db/serverモジュールをモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    agent: {
      findUnique: mockAgentFindUnique,
      update: mockAgentUpdate,
    },
    agentExecutionLog: {
      create: mockExecutionLogCreate,
      update: mockExecutionLogUpdate,
    },
    $transaction: mockTransaction,
  },
  Prisma: {},
}));

// chatMcpToolsモジュールをモック
vi.mock("../../chat/chatMcpTools.js", () => ({
  getChatMcpTools: mockGetChatMcpTools,
}));

// gatewayモジュールをモック
vi.mock("../../../infrastructure/ai/index.js", () => ({
  gateway: vi.fn(() => "mocked-model"),
}));

// AIモジュールをモック（streamTextを使用）
vi.mock("ai", () => ({
  streamText: mockStreamText,
}));

// crypto.randomUUIDをモック
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-1234"),
}));

/** ツール呼び出しのモック入力型 */
type MockToolCall = {
  toolCallId: string;
  toolName: string;
  args: unknown;
};

/** ツール結果のモック入力型 */
type MockToolResult = {
  toolCallId: string;
  result: unknown;
};

/** ステップのモック入力型 */
type MockStep = {
  toolCalls?: MockToolCall[];
  toolResults?: MockToolResult[];
};

/**
 * streamTextのモックレスポンスを作成するヘルパー
 */
const createMockStreamResult = (text: string, steps?: MockStep[]) => {
  // stepsプロパティ用のデータを変換
  const stepsData = (steps ?? []).map((step) => ({
    toolCalls: (step.toolCalls ?? []).map(({ toolCallId, toolName, args }) => ({
      toolCallId,
      toolName,
      input: args,
    })),
    toolResults: (step.toolResults ?? []).map(({ toolCallId, result }) => ({
      toolCallId,
      output: result,
    })),
  }));

  return {
    fullStream: (async function* () {
      if (text) {
        yield { type: "text-delta", text };
      }
    })(),
    steps: Promise.resolve(stepsData),
  };
};

describe("executeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトでエージェントが見つかるようにモック
    mockAgentFindUnique.mockResolvedValue({
      id: "agent-123",
      name: "テストエージェント",
      organizationId: "org-123",
      systemPrompt: "あなたはテストエージェントです",
      modelId: "anthropic/claude-3-5-sonnet",
      createdById: "creator-user-123",
      mcpServers: [],
    });
    // デフォルトでMCPツールなし
    mockGetChatMcpTools.mockResolvedValue({ tools: {}, toolNames: [] });

    // pending状態のログ作成（新しい実装: 最初にsuccess:nullで作成）
    mockExecutionLogCreate.mockResolvedValue({
      id: "log-1",
      agentId: "agent-123",
      scheduleId: null,
      success: null,
      durationMs: null,
      createdAt: new Date(),
    });

    // ログ更新用モック（新しい実装: 完了時にupdateで更新）
    mockExecutionLogUpdate.mockResolvedValue({
      id: "log-1",
      success: true,
      durationMs: 100,
    });

    // トランザクション用モック（createdByIdがあるとupdateExecutionLogWithChatが呼ばれる）
    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        chat: { create: mockChatCreate },
        message: { create: mockMessageCreate },
        agentExecutionLog: { update: mockExecutionLogUpdateTx },
      };
      return callback(tx);
    });
    mockChatCreate.mockResolvedValue({ id: "chat-1" });
    mockMessageCreate.mockResolvedValue({ id: "message-1" });
    mockExecutionLogUpdateTx.mockResolvedValue({ id: "log-1" });
  });

  test("スケジュールトリガーでエージェントを正常に実行する", async () => {
    mockStreamText.mockReturnValueOnce(
      createMockStreamResult("タスク完了しました"),
    );

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
    mockStreamText.mockReturnValueOnce(createMockStreamResult("手動実行完了"));

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
    mockStreamText.mockReturnValueOnce(
      createMockStreamResult("Webhook処理完了"),
    );

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
    mockStreamText.mockReturnValueOnce(createMockStreamResult("A2A実行完了"));

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
    // streamTextがエラーを投げるストリームを返す
    mockStreamText.mockReturnValueOnce({
      fullStream: (async function* () {
        throw new Error("API Error");
      })(),
      steps: Promise.resolve([]),
    });

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
    mockStreamText.mockReturnValueOnce(
      createMockStreamResult("デフォルトタスク完了"),
    );

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: null,
    };

    await executeAgent(request);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "定期実行タスクを開始してください。",
      }),
    );
  });

  test("実行ログがDBに保存される（createdByIdあり）", async () => {
    mockStreamText.mockReturnValueOnce(createMockStreamResult("タスク完了"));

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "テストタスク",
    };

    await executeAgent(request);

    // 新しい実装: 最初にpending状態（success: null）で作成される
    expect(mockExecutionLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentId: "agent-123",
          scheduleId: "schedule-456",
          success: null,
        }) as Record<string, unknown>,
      }),
    );

    // createdByIdがあるのでトランザクション経由でupdateされる
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockChatCreate).toHaveBeenCalled();
    expect(mockExecutionLogUpdateTx).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({
          success: true,
        }) as Record<string, unknown>,
      }),
    );
  });

  test("実行ログがDBに保存される（createdByIdなし）", async () => {
    mockAgentFindUnique.mockResolvedValueOnce({
      id: "agent-123",
      name: "テストエージェント",
      organizationId: "org-123",
      systemPrompt: "あなたはテストエージェントです",
      modelId: "anthropic/claude-3-5-sonnet",
      createdById: null,
      mcpServers: [],
    });

    mockStreamText.mockReturnValueOnce(createMockStreamResult("タスク完了"));

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "テストタスク",
    };

    await executeAgent(request);

    // 新しい実装: 最初にpending状態（success: null）で作成される
    expect(mockExecutionLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentId: "agent-123",
          scheduleId: "schedule-456",
          success: null,
        }) as Record<string, unknown>,
      }),
    );

    // createdByIdがnullの場合はシンプルにupdate
    expect(mockExecutionLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({
          success: true,
        }) as Record<string, unknown>,
      }),
    );
  });

  test("エージェントのカスタムシステムプロンプトが使用される", async () => {
    mockAgentFindUnique.mockResolvedValueOnce({
      id: "agent-123",
      name: "テストエージェント",
      organizationId: "org-123",
      systemPrompt: "カスタムプロンプト: データ分析を行ってください",
      modelId: "anthropic/claude-3-5-sonnet",
      createdById: "creator-user-123",
      mcpServers: [],
    });

    mockStreamText.mockReturnValueOnce(createMockStreamResult("分析完了"));

    const request: ExecuteAgentRequest = {
      agentId: "agent-123",
      trigger: { type: "schedule", scheduleId: "schedule-456" },
      message: "分析を開始",
    };

    await executeAgent(request);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          "カスタムプロンプト: データ分析を行ってください",
        ) as string,
      }),
    );
  });

  describe("MCPツール統合", () => {
    test("MCPサーバーが紐づいている場合はツールを取得して実行する", async () => {
      // MCPサーバー付きのエージェント
      mockAgentFindUnique.mockResolvedValueOnce({
        id: "agent-123",
        name: "テストエージェント",
        organizationId: "org-123",
        systemPrompt: "あなたはテストエージェントです",
        modelId: "anthropic/claude-3-5-sonnet",
        createdById: "creator-user-123",
        mcpServers: [{ id: "mcp-server-1" }],
      });

      // MCPツールを返す
      const mockTool = {
        description: "テストツール",
        parameters: {},
        execute: vi.fn(),
      };
      mockGetChatMcpTools.mockResolvedValueOnce({
        tools: { test_tool: mockTool },
        toolNames: ["test_tool"],
      });

      mockStreamText.mockReturnValueOnce(
        createMockStreamResult("ツール実行完了"),
      );

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "テストタスク",
      };

      const result = await executeAgent(request);

      expect(result.success).toBe(true);
      expect(mockGetChatMcpTools).toHaveBeenCalledWith({
        mcpServerIds: ["mcp-server-1"],
        organizationId: "org-123",
        userId: "creator-user-123",
      });
      // streamTextにtoolsとmaxStepsが渡されることを確認
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: { test_tool: mockTool },
          maxSteps: 10,
        }),
      );
    });

    test("手動実行時はトリガーのuserIdを優先する", async () => {
      mockAgentFindUnique.mockResolvedValueOnce({
        id: "agent-123",
        name: "テストエージェント",
        organizationId: "org-123",
        systemPrompt: "あなたはテストエージェントです",
        modelId: "anthropic/claude-3-5-sonnet",
        createdById: "creator-user-123",
        mcpServers: [{ id: "mcp-server-1" }],
      });

      mockGetChatMcpTools.mockResolvedValueOnce({
        tools: {},
        toolNames: [],
      });

      mockStreamText.mockReturnValueOnce(
        createMockStreamResult("手動実行完了"),
      );

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "manual", userId: "manual-user-789" },
        message: "手動実行",
      };

      await executeAgent(request);

      // 手動実行のuserIdが使用される
      expect(mockGetChatMcpTools).toHaveBeenCalledWith({
        mcpServerIds: ["mcp-server-1"],
        organizationId: "org-123",
        userId: "manual-user-789",
      });
    });

    test("createdByIdがnullの場合はMCPツールなしで実行する", async () => {
      mockAgentFindUnique.mockResolvedValueOnce({
        id: "agent-123",
        name: "テストエージェント",
        organizationId: "org-123",
        systemPrompt: "あなたはテストエージェントです",
        modelId: "anthropic/claude-3-5-sonnet",
        createdById: null,
        mcpServers: [{ id: "mcp-server-1" }],
      });

      mockStreamText.mockReturnValueOnce(createMockStreamResult("実行完了"));

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "テストタスク",
      };

      const result = await executeAgent(request);

      expect(result.success).toBe(true);
      // getChatMcpToolsは呼ばれない
      expect(mockGetChatMcpTools).not.toHaveBeenCalled();
      // toolsなしでstreamTextが呼ばれる
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tools: expect.anything(),
        }),
      );
    });

    test("MCPサーバーがない場合はツールなしで実行する", async () => {
      mockAgentFindUnique.mockResolvedValueOnce({
        id: "agent-123",
        name: "テストエージェント",
        organizationId: "org-123",
        systemPrompt: "あなたはテストエージェントです",
        modelId: "anthropic/claude-3-5-sonnet",
        createdById: "creator-user-123",
        mcpServers: [],
      });

      mockStreamText.mockReturnValueOnce(createMockStreamResult("実行完了"));

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "テストタスク",
      };

      const result = await executeAgent(request);

      expect(result.success).toBe(true);
      // MCPサーバーがないのでgetChatMcpToolsは呼ばれない
      expect(mockGetChatMcpTools).not.toHaveBeenCalled();
    });

    test("ツール呼び出し結果がメッセージパーツに含まれる", async () => {
      mockAgentFindUnique.mockResolvedValueOnce({
        id: "agent-123",
        name: "テストエージェント",
        organizationId: "org-123",
        systemPrompt: "あなたはテストエージェントです",
        modelId: "anthropic/claude-3-5-sonnet",
        createdById: "creator-user-123",
        mcpServers: [{ id: "mcp-server-1" }],
      });

      mockGetChatMcpTools.mockResolvedValueOnce({
        tools: { github__create_issue: { description: "Issue作成" } },
        toolNames: ["github__create_issue"],
      });

      // ツール呼び出しを含む結果
      mockStreamText.mockReturnValueOnce(
        createMockStreamResult("Issueを作成しました", [
          {
            toolCalls: [
              {
                toolCallId: "call-123",
                toolName: "github__create_issue",
                args: { title: "テストIssue" },
              },
            ],
            toolResults: [
              {
                toolCallId: "call-123",
                result: { issueId: "issue-456" },
              },
            ],
          },
        ]),
      );

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "Issueを作成",
      };

      const result = await executeAgent(request);

      expect(result.success).toBe(true);
      expect(result.output).toBe("Issueを作成しました");
    });
  });

  describe("タイムアウト処理", () => {
    test("タイムアウト時はAbortControllerでストリームがキャンセルされる", async () => {
      // streamTextにabortSignalが渡されることを確認
      mockStreamText.mockReturnValueOnce(
        createMockStreamResult("タスク完了しました"),
      );

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "テストタスク",
      };

      await executeAgent(request);

      // streamTextがabortSignalオプション付きで呼ばれることを確認
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal) as AbortSignal,
        }),
      );
    });

    test("AbortErrorが発生した場合はタイムアウトエラーとして処理される", async () => {
      // AbortErrorをシミュレート
      const abortError = new Error("Execution timeout");
      mockStreamText.mockReturnValueOnce({
        fullStream: (async function* () {
          throw abortError;
        })(),
        steps: Promise.resolve([]),
      });

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "テストタスク",
      };

      const result = await executeAgent(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Execution timeout");
    });

    test("DOMException AbortErrorが発生した場合もタイムアウトエラーとして処理される", async () => {
      // DOMException AbortErrorをシミュレート
      const abortError = new DOMException(
        "The operation was aborted",
        "AbortError",
      );
      mockStreamText.mockReturnValueOnce({
        fullStream: (async function* () {
          throw abortError;
        })(),
        steps: Promise.resolve([]),
      });

      const request: ExecuteAgentRequest = {
        agentId: "agent-123",
        trigger: { type: "schedule", scheduleId: "schedule-456" },
        message: "テストタスク",
      };

      const result = await executeAgent(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Execution timeout");
    });
  });
});
