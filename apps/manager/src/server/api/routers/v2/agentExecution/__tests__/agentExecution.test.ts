import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@tumiki/db";
import { McpServerVisibility } from "@tumiki/db/prisma";
import type { AgentId } from "@/schema/ids";
import { findExecutionsByAgentId } from "../findByAgentId";
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
          schedule: { name: "毎朝9時" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1500,
          createdAt: new Date("2024-01-01T09:00:00Z"),
        },
        {
          id: "exec-2",
          scheduleId: "schedule-1",
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
          schedule: { name: "スケジュール1" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1000,
          createdAt: new Date("2024-01-03T09:00:00Z"),
        },
        {
          id: "exec-2",
          scheduleId: "schedule-1",
          schedule: { name: "スケジュール1" },
          modelId: "anthropic/claude-3-5-sonnet",
          success: true,
          durationMs: 1100,
          createdAt: new Date("2024-01-02T09:00:00Z"),
        },
        {
          id: "exec-3",
          scheduleId: "schedule-1",
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
});
