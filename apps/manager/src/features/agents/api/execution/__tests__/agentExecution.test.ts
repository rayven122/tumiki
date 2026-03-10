/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@tumiki/db";
import { McpServerVisibility } from "@tumiki/db/prisma";
import type { AgentId } from "@/schema/ids";
import { findExecutionsByAgentId } from "../findByAgentId";
import { getAllRunningExecutions } from "../getAllRunning";
import { getRecentExecutions } from "../getRecentExecutions";
import { TRPCError } from "@trpc/server";

describe("AgentExecution", () => {
  let mockDb: PrismaClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testAgentId = "agent-123" as AgentId;

  beforeEach(() => {
    mockDb = {
      agent: {
        findFirst: vi.fn(),
      },
      agentExecutionLog: {
        findMany: vi.fn(),
      },
      message: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  describe("findExecutionsByAgentId", () => {
    test("実行履歴を取得できる", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 20,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          scheduleId: "schedule-1",
          chatId: "chat-1",
          schedule: { name: "毎朝9時" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1500,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
        {
          id: "exec-2",
          scheduleId: "schedule-1",
          chatId: null,
          schedule: { name: "毎朝9時" },
          modelId: "anthropic/claude-3-5-haiku",
          success: false,
          durationMs: 500,
          createdAt: new Date("2024-01-02T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      const result = await findExecutionsByAgentId(mockDb, input);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toStrictEqual({
        id: "exec-1",
        scheduleId: "schedule-1",
        chatId: "chat-1",
        scheduleName: "毎朝9時",
        modelId: "anthropic/claude-3-5-sonnet",
        success: true,
        durationMs: 1500,
        createdAt: new Date("2024-01-01T09:00:00Z"),
      });
      expect(result.items[1]?.success).toStrictEqual(false);
      expect(result.nextCursor).toBeUndefined();
    });

    test("スケジュールがない実行履歴を取得できる", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 20,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          scheduleId: null,
          chatId: null,
          schedule: null,
          modelId: null,
          success: true,
          durationMs: 1000,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      const result = await findExecutionsByAgentId(mockDb, input);

      expect(result.items[0]).toStrictEqual({
        id: "exec-1",
        scheduleId: null,
        chatId: null,
        scheduleName: null,
        modelId: null,
        success: true,
        durationMs: 1000,
        createdAt: new Date("2024-01-01T09:00:00Z"),
      });
    });

    test("ページネーションが正しく動作する（次ページあり）", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 2,
      };

      // limit + 1 = 3件返す（次ページがあることを示す）
      const mockExecutions = [
        {
          id: "exec-1",
          scheduleId: "schedule-1",
          chatId: "chat-1",
          schedule: { name: "スケジュール1" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1000,
          createdAt: new Date("2024-01-03T09:00:00Z"),
        },
        {
          id: "exec-2",
          scheduleId: "schedule-1",
          chatId: "chat-2",
          schedule: { name: "スケジュール1" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1100,
          createdAt: new Date("2024-01-02T09:00:00Z"),
        },
        {
          id: "exec-3",
          scheduleId: "schedule-1",
          chatId: null,
          schedule: { name: "スケジュール1" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: false,
          durationMs: 500,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      const result = await findExecutionsByAgentId(mockDb, input);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toStrictEqual("exec-2");
      expect(result.items[0]?.id).toStrictEqual("exec-1");
      expect(result.items[1]?.id).toStrictEqual("exec-2");
    });

    test("カーソルを使用してページネーションできる", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 20,
        cursor: "exec-2",
      };

      const mockExecutions = [
        {
          id: "exec-3",
          scheduleId: "schedule-1",
          chatId: "chat-3",
          schedule: { name: "スケジュール1" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1000,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      const result = await findExecutionsByAgentId(mockDb, input);

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
      expect(mockDb.agentExecutionLog.findMany).toHaveBeenCalledWith({
        where: { agentId: testAgentId, success: { not: null } },
        take: 21,
        cursor: { id: "exec-2" },
        skip: 1,
        select: {
          id: true,
          scheduleId: true,
          chatId: true,
          schedule: {
            select: {
              name: true,
            },
          },
          modelId: true,
          success: true,
          durationMs: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    test("実行履歴がない場合は空配列を返す", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 20,
      };

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue([]);

      const result = await findExecutionsByAgentId(mockDb, input);

      expect(result.items).toStrictEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    test("存在しないエージェントの場合はエラーになる", async () => {
      const input = {
        agentId: "non-existent-agent" as AgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 20,
      };

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue(null);

      await expect(findExecutionsByAgentId(mockDb, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(
        findExecutionsByAgentId(mockDb, input),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "エージェントが見つかりません",
      });
    });

    test("アクセス権限チェックのクエリが正しい", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 20,
      };

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue([]);

      await findExecutionsByAgentId(mockDb, input);

      expect(mockDb.agent.findFirst).toHaveBeenCalledWith({
        where: {
          id: testAgentId,
          OR: [
            { organizationId: testOrganizationId, createdById: testUserId },
            {
              organizationId: testOrganizationId,
              visibility: McpServerVisibility.ORGANIZATION,
            },
          ],
        },
        select: { id: true },
      });
    });
  });

  describe("getRecentExecutions", () => {
    test("直近の実行履歴を取得できる（成功/失敗/実行中すべて含む）", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          agentId: "agent-1",
          chatId: "chat-1",
          success: true,
          modelId: "anthropic/claude-3-5-haiku",
          durationMs: 5000,
          agent: {
            name: "Test Agent 1",
            slug: "test-agent-1",
            iconPath: null,
            estimatedDurationMs: null,
          },
          schedule: { name: "daily-report" },
          createdAt: new Date("2024-01-03T09:00:00Z"),
        },
        {
          id: "exec-2",
          agentId: "agent-2",
          chatId: "chat-2",
          success: false,
          modelId: null,
          durationMs: null,
          agent: {
            name: "Test Agent 2",
            slug: "test-agent-2",
            iconPath: null,
            estimatedDurationMs: null,
          },
          schedule: null,
          createdAt: new Date("2024-01-02T09:00:00Z"),
        },
        {
          id: "exec-3",
          agentId: "agent-3",
          chatId: "chat-3",
          success: null, // 実行中
          modelId: "anthropic/claude-3-5-sonnet",
          durationMs: null,
          agent: {
            name: "Test Agent 3",
            slug: "test-agent-3",
            iconPath: null,
            estimatedDurationMs: null,
          },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      const mockMessages = [
        {
          chatId: "chat-1",
          parts: [{ type: "text", text: "処理が完了しました" }],
        },
        {
          chatId: "chat-2",
          parts: [{ type: "text", text: "エラーが発生しました" }],
        },
        {
          chatId: "chat-3",
          parts: [{ type: "text", text: "処理中です..." }],
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue(
        mockMessages as unknown as Awaited<
          ReturnType<typeof mockDb.message.findMany>
        >,
      );

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toStrictEqual({
        id: "exec-1",
        agentId: "agent-1",
        chatId: "chat-1",
        success: true,
        agentName: "Test Agent 1",
        agentSlug: "test-agent-1",
        agentIconPath: null,
        estimatedDurationMs: null,
        latestMessage: "処理が完了しました",
        createdAt: new Date("2024-01-03T09:00:00Z"),
        scheduleName: "daily-report",
        modelId: "anthropic/claude-3-5-haiku",
        durationMs: 5000,
        toolCalls: [],
      });
      expect(result.items[1]?.success).toStrictEqual(false);
      expect(result.items[1]?.scheduleName).toStrictEqual(null);
      expect(result.items[2]?.success).toStrictEqual(null); // 実行中
    });

    test("chatIdがない実行履歴はlatestMessageがnullになる", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          chatId: null,
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent" },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue([]);

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items[0]?.latestMessage).toStrictEqual(null);
      expect(result.items[0]?.chatId).toStrictEqual(null);
      expect(result.items[0]?.toolCalls).toStrictEqual([]);
    });

    test("長いメッセージは60文字に切り詰められる", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      const longText =
        "これは非常に長いテキストメッセージです。60文字を超える部分は切り詰められます。この文は60文字を超えています。さらにもっと長くします。";
      const mockExecutions = [
        {
          id: "exec-1",
          chatId: "chat-1",
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent" },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      const mockMessages = [
        {
          chatId: "chat-1",
          parts: [{ type: "text", text: longText }],
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue(
        mockMessages as unknown as Awaited<
          ReturnType<typeof mockDb.message.findMany>
        >,
      );

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items[0]?.latestMessage).toStrictEqual(
        longText.substring(0, 60) + "...",
      );
    });

    test("ページネーションが正しく動作する（次ページあり）", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 2,
      };

      // limit + 1 = 3件返す（次ページがあることを示す）
      const mockExecutions = [
        {
          id: "exec-1",
          chatId: "chat-1",
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent-1" },
          schedule: null,
          createdAt: new Date("2024-01-03T09:00:00Z"),
        },
        {
          id: "exec-2",
          chatId: "chat-2",
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent-2" },
          schedule: null,
          createdAt: new Date("2024-01-02T09:00:00Z"),
        },
        {
          id: "exec-3",
          chatId: "chat-3",
          success: false,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent-3" },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue([]);

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toStrictEqual("exec-2");
      expect(result.items[0]?.id).toStrictEqual("exec-1");
      expect(result.items[1]?.id).toStrictEqual("exec-2");
    });

    test("カーソルを使用してページネーションできる", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
        cursor: "exec-2",
      };

      const mockExecutions = [
        {
          id: "exec-3",
          chatId: "chat-3",
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent-3" },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue([]);

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();

      // カーソルがwhere句に含まれていることを確認
      expect(mockDb.agentExecutionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { lt: "exec-2" },
          }),
        }),
      );
    });

    test("実行履歴がない場合は空配列を返す", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue([]);
      vi.mocked(mockDb.message.findMany).mockResolvedValue([]);

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items).toStrictEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    test("アクセス権限チェックのクエリが正しい", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue([]);
      vi.mocked(mockDb.message.findMany).mockResolvedValue([]);

      await getRecentExecutions(mockDb, input);

      expect(mockDb.agentExecutionLog.findMany).toHaveBeenCalledWith({
        where: {
          agent: {
            OR: [
              { organizationId: testOrganizationId, createdById: testUserId },
              {
                organizationId: testOrganizationId,
                visibility: McpServerVisibility.ORGANIZATION,
              },
            ],
          },
        },
        select: {
          id: true,
          agentId: true,
          chatId: true,
          success: true,
          modelId: true,
          durationMs: true,
          agent: {
            select: {
              name: true,
              slug: true,
              iconPath: true,
              estimatedDurationMs: true,
            },
          },
          schedule: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6, // limit + 1 でページネーション判定
      });
    });

    test("textタイプ以外のパーツは無視される", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          chatId: "chat-1",
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent" },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      const mockMessages = [
        {
          chatId: "chat-1",
          parts: [{ type: "tool-call", toolName: "some-tool" }],
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue(
        mockMessages as unknown as Awaited<
          ReturnType<typeof mockDb.message.findMany>
        >,
      );

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items[0]?.latestMessage).toStrictEqual(null);
    });

    test("ツール呼び出し情報が正しく抽出される", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
        limit: 5,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          chatId: "chat-1",
          success: true,
          modelId: null,
          durationMs: null,
          agent: { slug: "test-agent" },
          schedule: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      const mockMessages = [
        {
          chatId: "chat-1",
          parts: [
            { type: "text", text: "結果を表示します" },
            {
              type: "tool-server1__query-docs",
              toolName: "server1__query-docs",
              state: "output-available",
            },
            {
              type: "dynamic-tool",
              toolName: "server2__prefix__search",
              state: "output-available",
            },
          ],
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue(
        mockMessages as unknown as Awaited<
          ReturnType<typeof mockDb.message.findMany>
        >,
      );

      const result = await getRecentExecutions(mockDb, input);

      expect(result.items[0]?.toolCalls).toHaveLength(2);
      expect(result.items[0]?.toolCalls[0]).toStrictEqual({
        toolName: "query-docs",
        state: "success",
      });
      expect(result.items[0]?.toolCalls[1]).toStrictEqual({
        toolName: "search",
        state: "success",
      });
    });
  });

  describe("getAllRunningExecutions", () => {
    test("稼働中の全実行を取得できる", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          agentId: testAgentId,
          chatId: "chat-1",
          scheduleId: "schedule-1",
          schedule: { name: "毎朝9時" },
          agent: {
            name: "テストエージェント",
            slug: "test-agent",
            iconPath: "/icons/test.png",
            estimatedDurationMs: 60000,
          },
          modelId: "anthropic/claude-3-5-sonnet",
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      const mockMessages = [
        {
          chatId: "chat-1",
          parts: [{ type: "text", text: "処理中です..." }],
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue(
        mockMessages as unknown as Awaited<
          ReturnType<typeof mockDb.message.findMany>
        >,
      );

      const result = await getAllRunningExecutions(mockDb, input);

      expect(result).toHaveLength(1);
      expect(result[0]).toStrictEqual({
        id: "exec-1",
        agentId: testAgentId,
        chatId: "chat-1",
        scheduleId: "schedule-1",
        scheduleName: "毎朝9時",
        agentName: "テストエージェント",
        agentSlug: "test-agent",
        agentIconPath: "/icons/test.png",
        estimatedDurationMs: 60000,
        modelId: "anthropic/claude-3-5-sonnet",
        createdAt: new Date("2024-01-01T09:00:00Z"),
        latestMessage: "処理中です...",
      });
    });

    test("メッセージ取得クエリにdistinctが含まれている", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          agentId: testAgentId,
          chatId: "chat-1",
          scheduleId: null,
          schedule: null,
          agent: {
            name: "テストエージェント",
            slug: "test-agent",
            iconPath: null,
            estimatedDurationMs: null,
          },
          modelId: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue([]);

      await getAllRunningExecutions(mockDb, input);

      // distinctオプションがクエリに含まれていることを確認
      expect(mockDb.message.findMany).toHaveBeenCalledWith({
        where: {
          chatId: { in: ["chat-1"] },
          role: "assistant",
        },
        orderBy: { createdAt: "desc" },
        distinct: ["chatId"],
        select: {
          chatId: true,
          parts: true,
        },
      });
    });

    test("chatIdがない場合はメッセージを取得しない", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      const mockExecutions = [
        {
          id: "exec-1",
          agentId: testAgentId,
          chatId: null,
          scheduleId: null,
          schedule: null,
          agent: {
            name: "テストエージェント",
            slug: "test-agent",
            iconPath: null,
            estimatedDurationMs: null,
          },
          modelId: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      const result = await getAllRunningExecutions(mockDb, input);

      // chatIdがないのでメッセージ取得はスキップされる
      expect(mockDb.message.findMany).not.toHaveBeenCalled();
      expect(result[0]?.latestMessage).toStrictEqual(null);
    });

    test("稼働中の実行がない場合は空配列を返す", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue([]);

      const result = await getAllRunningExecutions(mockDb, input);

      expect(result).toStrictEqual([]);
      expect(mockDb.message.findMany).not.toHaveBeenCalled();
    });

    test("長いメッセージは50文字に切り詰められる", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      // 50文字を超えるテキスト（60文字）
      const longText =
        "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん。終了です。";

      const mockExecutions = [
        {
          id: "exec-1",
          agentId: testAgentId,
          chatId: "chat-1",
          scheduleId: null,
          schedule: null,
          agent: {
            name: "テストエージェント",
            slug: "test-agent",
            iconPath: null,
            estimatedDurationMs: null,
          },
          modelId: null,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
      ];

      const mockMessages = [
        {
          chatId: "chat-1",
          parts: [{ type: "text", text: longText }],
        },
      ];

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue(
        mockExecutions as unknown as Awaited<
          ReturnType<typeof mockDb.agentExecutionLog.findMany>
        >,
      );

      vi.mocked(mockDb.message.findMany).mockResolvedValue(
        mockMessages as unknown as Awaited<
          ReturnType<typeof mockDb.message.findMany>
        >,
      );

      const result = await getAllRunningExecutions(mockDb, input);

      expect(result[0]?.latestMessage).toStrictEqual(
        longText.substring(0, 50) + "...",
      );
    });

    test("アクセス権限チェックのクエリが正しい", async () => {
      const input = {
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agentExecutionLog.findMany).mockResolvedValue([]);

      await getAllRunningExecutions(mockDb, input);

      expect(mockDb.agentExecutionLog.findMany).toHaveBeenCalledWith({
        where: {
          success: null,
          agent: {
            OR: [
              { organizationId: testOrganizationId, createdById: testUserId },
              {
                organizationId: testOrganizationId,
                visibility: McpServerVisibility.ORGANIZATION,
              },
            ],
          },
        },
        select: {
          id: true,
          agentId: true,
          chatId: true,
          scheduleId: true,
          schedule: { select: { name: true } },
          agent: {
            select: {
              name: true,
              slug: true,
              iconPath: true,
              estimatedDurationMs: true,
            },
          },
          modelId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
