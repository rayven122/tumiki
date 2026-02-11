/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaTransactionClient } from "@tumiki/db";
import { McpServerVisibility, ServerStatus } from "@tumiki/db/prisma";
import type { AgentId, McpServerId } from "@/schema/ids";
import { createAgent } from "../create";
import { updateAgent } from "../update";
import { deleteAgent } from "../delete";
import { findAllAgents } from "../findAll";
import { findAgentById } from "../findById";
import { findAgentBySlug } from "../findBySlug";
import { TRPCError } from "@trpc/server";

// generateUniqueAgentSlugのモック
vi.mock("@tumiki/db/utils/slug", () => ({
  generateUniqueAgentSlug: vi.fn().mockResolvedValue("test-agent"),
  normalizeSlug: vi.fn((slug: string) => slug.toLowerCase()),
}));

describe("Agent CRUD", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testAgentId = "agent-123" as AgentId;
  const testSlug = "test-agent";

  beforeEach(() => {
    vi.clearAllMocks();
    // Prismaトランザクションクライアントのモック
    mockTx = {
      agent: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      organization: {
        findUnique: vi.fn().mockResolvedValue({ slug: "test-org" }),
      },
      organizationMember: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaTransactionClient;
  });

  describe("createAgent", () => {
    test("エージェントを作成できる（スラグ自動生成）", async () => {
      const input = {
        name: "テストエージェント",
        description: "テスト用のエージェントです",
        systemPrompt: "あなたはテスト用のアシスタントです。",
        visibility: McpServerVisibility.PRIVATE,
      };

      vi.mocked(mockTx.agent.create).mockResolvedValue({
        id: testAgentId,
        slug: testSlug,
        name: input.name,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.create>>);

      const result = await createAgent(
        mockTx,
        input,
        testOrganizationId,
        testUserId,
      );

      expect(result.id).toBe(testAgentId);
      expect(result.slug).toBe(testSlug);
      expect(mockTx.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: testSlug,
          name: input.name,
        }),
        select: {
          id: true,
          slug: true,
          name: true,
        },
      });
    });

    test("カスタムスラグでエージェントを作成できる", async () => {
      const customSlug = "custom-agent";
      const input = {
        name: "カスタムスラグエージェント",
        slug: customSlug,
        systemPrompt: "カスタムスラグのテスト",
        visibility: McpServerVisibility.PRIVATE,
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null); // 重複なし
      vi.mocked(mockTx.agent.create).mockResolvedValue({
        id: testAgentId,
        slug: customSlug,
        name: input.name,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.create>>);

      const result = await createAgent(
        mockTx,
        input,
        testOrganizationId,
        testUserId,
      );

      expect(result.slug).toBe(customSlug);
    });

    test("重複するスラグでの作成はエラーになる", async () => {
      const duplicateSlug = "existing-agent";
      const input = {
        name: "重複スラグエージェント",
        slug: duplicateSlug,
        systemPrompt: "重複スラグのテスト",
        visibility: McpServerVisibility.PRIVATE,
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue({
        id: "existing-agent-id",
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      await expect(
        createAgent(mockTx, input, testOrganizationId, testUserId),
      ).rejects.toMatchObject({
        code: "CONFLICT",
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
        slug: testSlug,
        name: input.name,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.create>>);

      const result = await createAgent(
        mockTx,
        input,
        testOrganizationId,
        testUserId,
      );

      expect(result.id).toBe(testAgentId);
      expect(mockTx.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mcpServers: {
            connect: mcpServerIds.map((id) => ({ id })),
          },
        }),
        select: {
          id: true,
          slug: true,
          name: true,
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
        slug: testSlug,
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
        data: expect.objectContaining({
          name: input.name,
          systemPrompt: input.systemPrompt,
        }),
        select: {
          id: true,
        },
      });
    });

    test("スラグを更新できる", async () => {
      const newSlug = "updated-agent";
      const input = {
        id: testAgentId,
        slug: newSlug,
      };

      vi.mocked(mockTx.agent.findFirst)
        .mockResolvedValueOnce({
          id: testAgentId,
          slug: testSlug,
        } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>)
        .mockResolvedValueOnce(null); // 重複チェック

      vi.mocked(mockTx.agent.update).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.update>>);

      await updateAgent(mockTx, input, testOrganizationId);

      expect(mockTx.agent.update).toHaveBeenCalledWith({
        where: {
          id: input.id,
        },
        data: expect.objectContaining({
          slug: newSlug,
        }),
        select: {
          id: true,
        },
      });
    });

    test("重複するスラグへの更新はエラーになる", async () => {
      const duplicateSlug = "existing-slug";
      const input = {
        id: testAgentId,
        slug: duplicateSlug,
      };

      vi.mocked(mockTx.agent.findFirst)
        .mockResolvedValueOnce({
          id: testAgentId,
          slug: testSlug,
        } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>)
        .mockResolvedValueOnce({
          id: "other-agent-id",
        } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      await expect(
        updateAgent(mockTx, input, testOrganizationId),
      ).rejects.toMatchObject({
        code: "CONFLICT",
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
        slug: testSlug,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.findFirst>>);

      vi.mocked(mockTx.agent.update).mockResolvedValue({
        id: testAgentId,
      } as unknown as Awaited<ReturnType<typeof mockTx.agent.update>>);

      await updateAgent(mockTx, input, testOrganizationId);

      expect(mockTx.agent.update).toHaveBeenCalledWith({
        where: {
          id: input.id,
        },
        data: expect.objectContaining({
          mcpServers: {
            set: newMcpServerIds.map((id) => ({ id })),
          },
        }),
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
          slug: "agent-1-slug",
          name: "エージェント1",
          description: "説明1",
          iconPath: null,
          systemPrompt: "プロンプト1",
          modelId: null,
          visibility: McpServerVisibility.PRIVATE,
          estimatedDurationMs: 30000,
          createdById: testUserId,
          createdBy: { id: testUserId, name: "Test User", image: null },
          mcpServers: [],
          schedules: [],
          _count: { executionLogs: 0 },
          executionLogs: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "agent-2",
          slug: "agent-2-slug",
          name: "エージェント2",
          description: "説明2",
          iconPath: null,
          systemPrompt: "プロンプト2",
          modelId: null,
          visibility: McpServerVisibility.PRIVATE,
          estimatedDurationMs: 30000,
          createdById: testUserId,
          createdBy: { id: testUserId, name: "Test User", image: null },
          mcpServers: [],
          schedules: [],
          _count: { executionLogs: 0 },
          executionLogs: [],
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
      expect(agents[0]?.slug).toBe("agent-1-slug");
    });

    test("ORGANIZATION可視性のエージェントを含むクエリが正しい", async () => {
      vi.mocked(mockTx.agent.findMany).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof mockTx.agent.findMany>>,
      );

      await findAllAgents(mockTx, {
        organizationId: testOrganizationId,
        userId: testUserId,
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
        select: expect.objectContaining({
          id: true,
          slug: true,
          name: true,
          description: true,
        }),
        orderBy: {
          updatedAt: "desc",
        },
      });
    });
  });

  describe("findAgentById", () => {
    test("エージェント詳細を取得できる", async () => {
      const mockAgent = {
        id: testAgentId,
        slug: testSlug,
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
            slug: "github",
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
      expect(result.slug).toBe(testSlug);
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

  describe("findAgentBySlug", () => {
    test("スラグでエージェント詳細を取得できる", async () => {
      const mockAgent = {
        id: testAgentId,
        slug: testSlug,
        name: "スラグ検索テスト",
        description: "説明",
        iconPath: null,
        systemPrompt: "スラグ検索用",
        modelId: null,
        visibility: McpServerVisibility.PRIVATE,
        organizationId: testOrganizationId,
        createdById: testUserId,
        createdBy: { id: testUserId, name: "Test User", image: null },
        mcpServers: [],
        schedules: [],
        executionLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(
        mockAgent as unknown as Awaited<
          ReturnType<typeof mockTx.agent.findFirst>
        >,
      );

      const result = await findAgentBySlug(mockTx, {
        slug: testSlug,
        organizationId: testOrganizationId,
        userId: testUserId,
      });

      expect(result.id).toBe(testAgentId);
      expect(result.slug).toBe(testSlug);
      expect(result.name).toBe("スラグ検索テスト");
    });

    test("存在しないスラグの取得はエラーになる", async () => {
      vi.mocked(mockTx.agent.findFirst).mockResolvedValue(null);

      await expect(
        findAgentBySlug(mockTx, {
          slug: "non-existent-slug",
          organizationId: testOrganizationId,
          userId: testUserId,
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        findAgentBySlug(mockTx, {
          slug: "non-existent-slug",
          organizationId: testOrganizationId,
          userId: testUserId,
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});
