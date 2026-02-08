import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaTransactionClient } from "@tumiki/db";
import { McpServerVisibility, ServerStatus } from "@tumiki/db/prisma";
import type { AgentId, McpServerId } from "@/schema/ids";
import { createAgent } from "../create";
import { updateAgent } from "../update";
import { deleteAgent } from "../delete";
import { findAllAgents } from "../findAll";
import { findAgentById } from "../findById";
import { TRPCError } from "@trpc/server";

describe("Agent CRUD", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testAgentId = "agent-123" as AgentId;

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      agent: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  describe("createAgent", () => {
    test("エージェントを作成できる", async () => {
      const input = {
        name: "テストエージェント",
        description: "テスト用のエージェントです",
        systemPrompt: "あなたはテスト用のアシスタントです。",
        visibility: McpServerVisibility.PRIVATE,
      };

      vi.mocked(mockTx.agent.create).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.create>>);

      const result = await createAgent(
        mockTx,
        input,
        testOrganizationId,
        testUserId,
      );

      expect(result.id).toBe(testAgentId);
      expect(mockTx.agent.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          iconPath: undefined,
          systemPrompt: input.systemPrompt,
          modelId: undefined,
          visibility: input.visibility,
          organizationId: testOrganizationId,
          createdById: testUserId,
          mcpServers: undefined,
        },
        select: {
          id: true,
        },
      });
    });

    test("MCPサーバーを紐付けてエージェントを作成できる", async () => {
      const mcpServerIds = ["mcp-1" as McpServerId, "mcp-2" as McpServerId];
      const input = {
        name: "MCPエージェント",
        systemPrompt: "MCPサーバーを使うエージェント",
        visibility: McpServerVisibility.PRIVATE,
        mcpServerIds,
      };

      vi.mocked(mockTx.agent.create).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.create>>);

      const result = await createAgent(
        mockTx,
        input,
        testOrganizationId,
        testUserId,
      );

      expect(result.id).toBe(testAgentId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const expectedData = expect.objectContaining({
        mcpServers: {
          connect: mcpServerIds.map((id) => ({ id })),
        },
      });
      expect(mockTx.agent.create).toHaveBeenCalledWith({
        data: expectedData,
        select: {
          id: true,
        },
      });
    });
  });

  describe("updateAgent", () => {
    test("エージェントを更新できる", async () => {
      const input = {
        id: testAgentId,
        name: "更新後",
        systemPrompt: "更新後のプロンプト",
        visibility: McpServerVisibility.ORGANIZATION,
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      vi.mocked(mockTx.agent.update).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.update>>);

      const result = await updateAgent(mockTx, input, testOrganizationId);

      expect(result.id).toBe(testAgentId);
      expect(mockTx.agent.update).toHaveBeenCalledWith({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: undefined,
          iconPath: undefined,
          systemPrompt: input.systemPrompt,
          modelId: undefined,
          visibility: input.visibility,
          mcpServers: undefined,
        },
        select: {
          id: true,
        },
      });
    });

    test("MCPサーバーを更新できる", async () => {
      const newMcpServerIds = ["mcp-3" as McpServerId, "mcp-4" as McpServerId];
      const input = {
        id: testAgentId,
        mcpServerIds: newMcpServerIds,
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      vi.mocked(mockTx.agent.update).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.update>>);

      await updateAgent(mockTx, input, testOrganizationId);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const expectedData = expect.objectContaining({
        mcpServers: {
          set: newMcpServerIds.map((id) => ({ id })),
        },
      });
      expect(mockTx.agent.update).toHaveBeenCalledWith({
        where: {
          id: input.id,
        },
        data: expectedData,
        select: {
          id: true,
        },
      });
    });

    test("存在しないエージェントの更新はエラーになる", async () => {
      const input = {
        id: "non-existent-id" as AgentId,
        name: "更新",
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null);

      await expect(
        updateAgent(mockTx, input, testOrganizationId),
      ).rejects.toThrow(TRPCError);

      await expect(
        updateAgent(mockTx, input, testOrganizationId),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("deleteAgent", () => {
    test("エージェントを削除できる", async () => {
      vi.mocked(mockTx.agent.findFirst).mockResolvedValue({
        id: testAgentId,
        name: "削除対象",
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      vi.mocked(mockTx.agent.delete).mockResolvedValue({
        id: testAgentId,
        name: "削除対象",
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.delete>>);

      const result = await deleteAgent(mockTx, {
        id: testAgentId,
        organizationId: testOrganizationId,
      });

      expect(result.id).toBe(testAgentId);
      expect(result.name).toBe("削除対象");
      expect(mockTx.agent.delete).toHaveBeenCalledWith({
        where: {
          id: testAgentId,
        },
      });
    });

    test("存在しないエージェントの削除はエラーになる", async () => {
      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null);

      await expect(
        deleteAgent(mockTx, {
          id: "non-existent-id" as AgentId,
          organizationId: testOrganizationId,
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        deleteAgent(mockTx, {
          id: "non-existent-id" as AgentId,
          organizationId: testOrganizationId,
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("findAllAgents", () => {
    test("自分が作成したエージェント一覧を取得できる", async () => {
      const mockAgents = [
        {
          id: "agent-1",
          name: "エージェント1",
          description: "説明1",
          iconPath: null,
          systemPrompt: "プロンプト1",
          modelId: null,
          visibility: McpServerVisibility.PRIVATE,
          createdById: testUserId,
          createdBy: { id: testUserId, name: "Test User", image: null },
          mcpServers: [],
          schedules: [],
          _count: { executionLogs: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "agent-2",
          name: "エージェント2",
          description: "説明2",
          iconPath: null,
          systemPrompt: "プロンプト2",
          modelId: null,
          visibility: McpServerVisibility.PRIVATE,
          createdById: testUserId,
          createdBy: { id: testUserId, name: "Test User", image: null },
          mcpServers: [],
          schedules: [],
          _count: { executionLogs: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockTx.agent.findMany).mockResolvedValue(
        mockAgents as unknown as Awaited<
          ReturnType<typeof mockTx.agent.findMany>
        >,
      );

      const agents = await findAllAgents(mockTx, {
        organizationId: testOrganizationId,
        userId: testUserId,
      });

      expect(agents).toHaveLength(2);
      expect(agents.map((a) => a.name)).toContain("エージェント1");
      expect(agents.map((a) => a.name)).toContain("エージェント2");
    });

    test("ORGANIZATION可視性のエージェントを含むクエリが正しい", async () => {
      vi.mocked(mockTx.agent.findMany).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof mockTx.agent.findMany>>,
      );

      await findAllAgents(mockTx, {
        organizationId: testOrganizationId,
        userId: testUserId,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const expectedSelect = expect.objectContaining({
        id: true,
        name: true,
        description: true,
      });
      expect(mockTx.agent.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { organizationId: testOrganizationId, createdById: testUserId },
            {
              organizationId: testOrganizationId,
              visibility: McpServerVisibility.ORGANIZATION,
            },
          ],
        },
        select: expectedSelect,
        orderBy: {
          updatedAt: "desc",
        },
      });
    });

    test("関連するMCPサーバー情報を含む", async () => {
      const mockAgents = [
        {
          id: "agent-1",
          name: "MCPエージェント",
          description: null,
          iconPath: null,
          systemPrompt: "プロンプト",
          modelId: null,
          visibility: McpServerVisibility.PRIVATE,
          createdById: testUserId,
          createdBy: { id: testUserId, name: "Test User", image: null },
          mcpServers: [
            { id: "mcp-1", name: "GitHub", iconPath: "lucide:github" },
            { id: "mcp-2", name: "Slack", iconPath: "lucide:slack" },
          ],
          schedules: [],
          _count: { executionLogs: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockTx.agent.findMany).mockResolvedValue(
        mockAgents as unknown as Awaited<
          ReturnType<typeof mockTx.agent.findMany>
        >,
      );

      const agents = await findAllAgents(mockTx, {
        organizationId: testOrganizationId,
        userId: testUserId,
      });

      expect(agents[0]?.mcpServers).toHaveLength(2);
      expect(agents[0]?.mcpServers[0]?.name).toBe("GitHub");
      expect(agents[0]?._count.executionLogs).toBe(5);
    });
  });

  describe("findAgentById", () => {
    test("エージェント詳細を取得できる", async () => {
      const mockAgent = {
        id: testAgentId,
        name: "詳細取得テスト",
        description: "説明",
        iconPath: null,
        systemPrompt: "詳細取得用",
        modelId: "anthropic/claude-3.5-haiku",
        visibility: McpServerVisibility.PRIVATE,
        organizationId: testOrganizationId,
        createdById: testUserId,
        createdBy: { id: testUserId, name: "Test User", image: null },
        mcpServers: [
          {
            id: "mcp-1",
            name: "GitHub",
            description: "GitHub MCP Server",
            iconPath: "lucide:github",
            serverStatus: ServerStatus.RUNNING,
          },
        ],
        schedules: [
          {
            id: "schedule-1",
            name: "毎朝9時",
            cronExpression: "0 9 * * *",
            timezone: "Asia/Tokyo",
            status: "ACTIVE",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        executionLogs: [
          {
            id: "log-1",
            scheduleId: "schedule-1",
            success: true,
            durationMs: 1500,
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(
        mockAgent as unknown as Awaited<
          ReturnType<typeof mockTx.agent.findFirst>
        >,
      );

      const result = await findAgentById(mockTx, {
        id: testAgentId,
        organizationId: testOrganizationId,
        userId: testUserId,
      });

      expect(result.id).toBe(testAgentId);
      expect(result.name).toBe("詳細取得テスト");
      expect(result.mcpServers).toHaveLength(1);
      expect(result.schedules).toHaveLength(1);
      expect(result.executionLogs).toHaveLength(1);
    });

    test("存在しないエージェントの取得はエラーになる", async () => {
      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null);

      await expect(
        findAgentById(mockTx, {
          id: "non-existent-id" as AgentId,
          organizationId: testOrganizationId,
          userId: testUserId,
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        findAgentById(mockTx, {
          id: "non-existent-id" as AgentId,
          organizationId: testOrganizationId,
          userId: testUserId,
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    test("他人のPRIVATEエージェントにはアクセスできない", async () => {
      // PRIVATEエージェントで作成者が異なる場合はfindFirstがnullを返す
      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null);

      const differentUserId = "other-user-456";

      await expect(
        findAgentById(mockTx, {
          id: testAgentId,
          organizationId: testOrganizationId,
          userId: differentUserId,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
