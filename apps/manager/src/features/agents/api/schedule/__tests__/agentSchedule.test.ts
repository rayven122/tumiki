import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaClient, PrismaTransactionClient } from "@tumiki/db";
import { McpServerVisibility } from "@tumiki/db/prisma";
import type { AgentId, AgentScheduleId } from "@/schema/ids";
import { createSchedule } from "../create";
import { updateSchedule } from "../update";
import { deleteSchedule } from "../delete";
import { toggleSchedule } from "../toggle";
import { findSchedulesByAgentId } from "../findByAgentId";
import { TRPCError } from "@trpc/server";

describe("AgentSchedule CRUD", () => {
  let mockTx: PrismaTransactionClient;
  let mockDb: PrismaClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testAgentId = "agent-123" as AgentId;
  const testScheduleId = "schedule-123" as AgentScheduleId;

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      agent: {
        findFirst: vi.fn(),
      },
      agentSchedule: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;

    // PrismaClientのモック（toggle, findByAgentId用）
    mockDb = {
      agent: {
        findFirst: vi.fn(),
      },
      agentSchedule: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  describe("createSchedule", () => {
    test("スケジュールを作成できる", async () => {
      const input = {
        agentId: testAgentId,
        name: "毎朝9時実行",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      vi.mocked(mockTx.agentSchedule.create).mockResolvedValue({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "ACTIVE",
      } as unknown as Awaited<ReturnType<typeof mockTx.agentSchedule.create>>);

      const result = await createSchedule(mockTx, input);

      expect(result).toStrictEqual({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "ACTIVE",
      });
      expect(mockTx.agent.findFirst).toHaveBeenCalledWith({
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
      expect(mockTx.agentSchedule.create).toHaveBeenCalledWith({
        data: {
          agentId: testAgentId,
          name: "毎朝9時実行",
          cronExpression: "0 9 * * *",
          timezone: "Asia/Tokyo",
          status: "ACTIVE",
        },
        select: {
          id: true,
          agentId: true,
          cronExpression: true,
          timezone: true,
          status: true,
        },
      });
    });

    test("存在しないエージェントへのスケジュール作成はエラーになる", async () => {
      const input = {
        agentId: "non-existent-agent" as AgentId,
        name: "テストスケジュール",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null);

      await expect(createSchedule(mockTx, input)).rejects.toThrow(TRPCError);
      await expect(createSchedule(mockTx, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "エージェントが見つかりません",
      });
    });
  });

  describe("updateSchedule", () => {
    test("スケジュールを更新できる", async () => {
      const input = {
        id: testScheduleId,
        name: "更新後の名前",
        cronExpression: "0 10 * * *",
        timezone: "America/New_York",
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agentSchedule.findFirst).mockResolvedValue({
        id: testScheduleId,
      } as unknown as Awaited<
        ReturnType<typeof mockTx.agentSchedule.findFirst>
      >);

      vi.mocked(mockTx.agentSchedule.update).mockResolvedValue({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 10 * * *",
        timezone: "America/New_York",
        status: "ACTIVE",
      } as unknown as Awaited<ReturnType<typeof mockTx.agentSchedule.update>>);

      const result = await updateSchedule(mockTx, input);

      expect(result).toStrictEqual({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 10 * * *",
        timezone: "America/New_York",
        status: "ACTIVE",
      });
      expect(mockTx.agentSchedule.update).toHaveBeenCalledWith({
        where: { id: testScheduleId },
        data: {
          name: "更新後の名前",
          cronExpression: "0 10 * * *",
          timezone: "America/New_York",
        },
        select: {
          id: true,
          agentId: true,
          cronExpression: true,
          timezone: true,
          status: true,
        },
      });
    });

    test("部分的な更新ができる（名前のみ）", async () => {
      const input = {
        id: testScheduleId,
        name: "新しい名前",
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agentSchedule.findFirst).mockResolvedValue({
        id: testScheduleId,
      } as unknown as Awaited<
        ReturnType<typeof mockTx.agentSchedule.findFirst>
      >);

      vi.mocked(mockTx.agentSchedule.update).mockResolvedValue({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "ACTIVE",
      } as unknown as Awaited<ReturnType<typeof mockTx.agentSchedule.update>>);

      const result = await updateSchedule(mockTx, input);

      expect(result.id).toStrictEqual(testScheduleId);
      expect(mockTx.agentSchedule.update).toHaveBeenCalledWith({
        where: { id: testScheduleId },
        data: {
          name: "新しい名前",
        },
        select: {
          id: true,
          agentId: true,
          cronExpression: true,
          timezone: true,
          status: true,
        },
      });
    });

    test("存在しないスケジュールの更新はエラーになる", async () => {
      const input = {
        id: "non-existent-schedule" as AgentScheduleId,
        name: "更新",
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agentSchedule.findFirst).mockResolvedValue(null);

      await expect(updateSchedule(mockTx, input)).rejects.toThrow(TRPCError);
      await expect(updateSchedule(mockTx, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "スケジュールが見つかりません",
      });
    });
  });

  describe("deleteSchedule", () => {
    test("スケジュールを削除できる", async () => {
      const input = {
        id: testScheduleId,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agentSchedule.findFirst).mockResolvedValue({
        id: testScheduleId,
        name: "削除対象スケジュール",
      } as unknown as Awaited<
        ReturnType<typeof mockTx.agentSchedule.findFirst>
      >);

      vi.mocked(mockTx.agentSchedule.delete).mockResolvedValue({
        id: testScheduleId,
        name: "削除対象スケジュール",
      } as unknown as Awaited<ReturnType<typeof mockTx.agentSchedule.delete>>);

      const result = await deleteSchedule(mockTx, input);

      expect(result).toStrictEqual({
        id: testScheduleId,
        name: "削除対象スケジュール",
      });
      expect(mockTx.agentSchedule.delete).toHaveBeenCalledWith({
        where: { id: testScheduleId },
      });
    });

    test("存在しないスケジュールの削除はエラーになる", async () => {
      const input = {
        id: "non-existent-schedule" as AgentScheduleId,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockTx.agentSchedule.findFirst).mockResolvedValue(null);

      await expect(deleteSchedule(mockTx, input)).rejects.toThrow(TRPCError);
      await expect(deleteSchedule(mockTx, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "スケジュールが見つかりません",
      });
    });
  });

  describe("toggleSchedule", () => {
    test("スケジュールをACTIVEに切り替えできる", async () => {
      const input = {
        id: testScheduleId,
        status: "ACTIVE" as const,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agentSchedule.findFirst).mockResolvedValue({
        id: testScheduleId,
      } as unknown as Awaited<
        ReturnType<typeof mockDb.agentSchedule.findFirst>
      >);

      vi.mocked(mockDb.agentSchedule.update).mockResolvedValue({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "ACTIVE",
      } as unknown as Awaited<ReturnType<typeof mockDb.agentSchedule.update>>);

      const result = await toggleSchedule(mockDb, input);

      expect(result).toStrictEqual({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "ACTIVE",
      });
      expect(mockDb.agentSchedule.update).toHaveBeenCalledWith({
        where: { id: testScheduleId },
        data: { status: "ACTIVE" },
        select: {
          id: true,
          agentId: true,
          cronExpression: true,
          timezone: true,
          status: true,
        },
      });
    });

    test("スケジュールをPAUSEDに切り替えできる", async () => {
      const input = {
        id: testScheduleId,
        status: "PAUSED" as const,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agentSchedule.findFirst).mockResolvedValue({
        id: testScheduleId,
      } as unknown as Awaited<
        ReturnType<typeof mockDb.agentSchedule.findFirst>
      >);

      vi.mocked(mockDb.agentSchedule.update).mockResolvedValue({
        id: testScheduleId,
        agentId: testAgentId,
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "PAUSED",
      } as unknown as Awaited<ReturnType<typeof mockDb.agentSchedule.update>>);

      const result = await toggleSchedule(mockDb, input);

      expect(result.status).toStrictEqual("PAUSED");
    });

    test("存在しないスケジュールの切り替えはエラーになる", async () => {
      const input = {
        id: "non-existent-schedule" as AgentScheduleId,
        status: "ACTIVE" as const,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agentSchedule.findFirst).mockResolvedValue(null);

      await expect(toggleSchedule(mockDb, input)).rejects.toThrow(TRPCError);
      await expect(toggleSchedule(mockDb, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "スケジュールが見つかりません",
      });
    });
  });

  describe("findSchedulesByAgentId", () => {
    test("エージェントのスケジュール一覧を取得できる", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      const mockSchedules = [
        {
          id: "schedule-1",
          name: "毎朝9時",
          cronExpression: "0 9 * * *",
          timezone: "Asia/Tokyo",
          status: "ACTIVE",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
          _count: { executionLogs: 10 },
        },
        {
          id: "schedule-2",
          name: "毎週月曜",
          cronExpression: "0 9 * * 1",
          timezone: "Asia/Tokyo",
          status: "PAUSED",
          createdAt: new Date("2024-01-02T00:00:00Z"),
          updatedAt: new Date("2024-01-02T00:00:00Z"),
          _count: { executionLogs: 5 },
        },
      ];

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentSchedule.findMany).mockResolvedValue(
        mockSchedules as unknown as Awaited<
          ReturnType<typeof mockDb.agentSchedule.findMany>
        >,
      );

      const result = await findSchedulesByAgentId(mockDb, input);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toStrictEqual("毎朝9時");
      expect(result[0]?._count.executionLogs).toStrictEqual(10);
      expect(result[1]?.status).toStrictEqual("PAUSED");
      expect(mockDb.agentSchedule.findMany).toHaveBeenCalledWith({
        where: { agentId: testAgentId },
        select: {
          id: true,
          name: true,
          cronExpression: true,
          timezone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              executionLogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    test("スケジュールがない場合は空配列を返す", async () => {
      const input = {
        agentId: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockDb.agent.findFirst>>);

      vi.mocked(mockDb.agentSchedule.findMany).mockResolvedValue([]);

      const result = await findSchedulesByAgentId(mockDb, input);

      expect(result).toStrictEqual([]);
    });

    test("存在しないエージェントの場合はエラーになる", async () => {
      const input = {
        agentId: "non-existent-agent" as AgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
      };

      vi.mocked(mockDb.agent.findFirst).mockResolvedValue(null);

      await expect(findSchedulesByAgentId(mockDb, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(findSchedulesByAgentId(mockDb, input)).rejects.toMatchObject(
        {
          code: "NOT_FOUND",
          message: "エージェントが見つかりません",
        },
      );
    });
  });
});
