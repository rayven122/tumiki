/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, test, vi } from "vitest";

// vi.hoistedを使用してモックを先に定義
const mockDb = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  mcpServerTemplate: {
    findMany: vi.fn(),
  },
  mcpServer: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mcpServerChild: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@tumiki/db/server", () => ({
  db: mockDb,
  OFFICIAL_ORGANIZATION_ID: "00000000-0000-0000-0000-000000000000",
  OFFICIAL_USER_ID: "00000000-0000-0000-0000-000000000001",
  ServerStatus: { RUNNING: "RUNNING" },
  ServerType: { OFFICIAL: "OFFICIAL", CUSTOM: "CUSTOM" },
  AuthType: { NONE: "NONE" },
  PiiMaskingMode: { DISABLED: "DISABLED" },
}));

// モック後にインポート
const { upsertUnifiedMcpServers } = await import("../upsertUnifiedMcpServers");

describe("upsertUnifiedMcpServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 公式ユーザーと組織は存在するものとしてモック
    mockDb.user.findUnique.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000001",
    });
    mockDb.organization.findUnique.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000000",
    });
  });

  describe("基本動作", () => {
    test("子サーバーテンプレートが存在しない場合はスキップする", async () => {
      // テンプレートが見つからない場合
      mockDb.mcpServerTemplate.findMany.mockResolvedValue([]);

      await upsertUnifiedMcpServers(["Add MCP", "Subtract MCP"]);

      // $transactionが呼ばれないことを確認
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    test("有効なサーバー名がない場合は処理をスキップする", async () => {
      // 子サーバー名と有効なサーバー名が一致しない場合
      await upsertUnifiedMcpServers(["NonExistent Server"]);

      // テンプレート検索が行われないことを確認
      expect(mockDb.mcpServerTemplate.findMany).not.toHaveBeenCalled();
    });

    test("子サーバーテンプレートが存在する場合はMcpServer(CUSTOM)を作成する", async () => {
      const mockTemplates = [
        {
          id: "template-add",
          name: "Add MCP",
          description: "足し算",
          iconPath: "/icon.svg",
          mcpTools: [{ id: "tool-add", name: "add" }],
        },
        {
          id: "template-subtract",
          name: "Subtract MCP",
          description: "引き算",
          iconPath: "/icon.svg",
          mcpTools: [{ id: "tool-subtract", name: "subtract" }],
        },
      ];

      mockDb.mcpServerTemplate.findMany.mockResolvedValue(mockTemplates);
      // 既存の統合MCPサーバー（serverType=CUSTOM）がない場合
      mockDb.mcpServer.findFirst.mockResolvedValue(null);

      // トランザクション内の処理をモック
      mockDb.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            mcpServer: {
              findFirst: vi.fn().mockResolvedValue(null),
              create: vi.fn().mockResolvedValue({ id: "mcp-server-1" }),
            },
          };
          return callback(txMock);
        },
      );

      await upsertUnifiedMcpServers([
        "Add MCP",
        "Subtract MCP",
        "Multiply MCP",
        "Divide MCP",
      ]);

      expect(mockDb.mcpServerTemplate.findMany).toHaveBeenCalled();
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    test("既存のMcpServer(CUSTOM)がある場合は更新する", async () => {
      const mockTemplates = [
        {
          id: "template-add",
          name: "Add MCP",
          description: "足し算",
          iconPath: "/icon.svg",
          mcpTools: [{ id: "tool-add", name: "add" }],
        },
      ];

      const existingUnifiedServer = {
        id: "existing-unified-1",
        name: "Calculator MCP",
        serverType: "CUSTOM",
        templateInstances: [
          {
            id: "instance-1",
            mcpServerTemplateId: "template-add",
            normalizedName: "add-mcp",
          },
        ],
      };

      mockDb.mcpServerTemplate.findMany.mockResolvedValue(mockTemplates);
      // 既存の統合MCPサーバー（serverType=CUSTOM）がある場合
      mockDb.mcpServer.findFirst.mockResolvedValue(existingUnifiedServer);

      mockDb.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            mcpServer: {
              findFirst: vi.fn().mockResolvedValue({ id: "existing-mcp-1" }),
              create: vi.fn(),
              update: vi
                .fn()
                .mockResolvedValue({ id: existingUnifiedServer.id }),
            },
            mcpServerTemplateInstance: {
              deleteMany: vi.fn(),
            },
          };
          return callback(txMock);
        },
      );

      await upsertUnifiedMcpServers(["Add MCP"]);

      // mcpServer.findFirst が呼ばれていることを確認（serverType=CUSTOM の検索）
      expect(mockDb.mcpServer.findFirst).toHaveBeenCalled();
    });
  });

  describe("公式ユーザーと組織の作成", () => {
    test("公式ユーザーが存在しない場合は作成する", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000001",
      });
      mockDb.mcpServerTemplate.findMany.mockResolvedValue([]);

      await upsertUnifiedMcpServers(["Add MCP"]);

      expect(mockDb.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "00000000-0000-0000-0000-000000000001",
          email: "official@tumiki.app",
        }),
      });
    });

    test("公式組織が存在しない場合は作成する", async () => {
      mockDb.organization.findUnique.mockResolvedValue(null);
      mockDb.organization.create.mockResolvedValue({
        id: "00000000-0000-0000-0000-000000000000",
      });
      mockDb.mcpServerTemplate.findMany.mockResolvedValue([]);

      await upsertUnifiedMcpServers(["Add MCP"]);

      expect(mockDb.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "00000000-0000-0000-0000-000000000000",
          name: "Official Organization",
        }),
      });
    });
  });

  describe("フィルタリング動作", () => {
    test("validServerNamesが未指定の場合は全ての子サーバーを対象にする", async () => {
      const mockTemplates = [
        {
          id: "template-add",
          name: "Add MCP",
          description: "足し算",
          iconPath: "/icon.svg",
          mcpTools: [],
        },
      ];

      mockDb.mcpServerTemplate.findMany.mockResolvedValue(mockTemplates);
      mockDb.mcpServer.findFirst.mockResolvedValue(null);
      mockDb.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            mcpServer: {
              findFirst: vi.fn().mockResolvedValue(null),
              create: vi.fn().mockResolvedValue({ id: "mcp-server-1" }),
            },
          };
          return callback(txMock);
        },
      );

      // validServerNames未指定
      await upsertUnifiedMcpServers();

      expect(mockDb.mcpServerTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              in: ["Add MCP", "Subtract MCP", "Multiply MCP", "Divide MCP"],
            },
            organizationId: "00000000-0000-0000-0000-000000000000",
          },
        }),
      );
    });

    test("validServerNamesで指定された子サーバーのみを対象にする", async () => {
      mockDb.mcpServerTemplate.findMany.mockResolvedValue([]);

      await upsertUnifiedMcpServers(["Add MCP", "Subtract MCP"]);

      expect(mockDb.mcpServerTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { in: ["Add MCP", "Subtract MCP"] },
            organizationId: "00000000-0000-0000-0000-000000000000",
          },
        }),
      );
    });
  });
});
