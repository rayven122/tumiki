import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { deleteMcpServerTemplate } from "../delete.ee";
import type { ProtectedContext } from "@/server/api/trpc";
import type { DeleteMcpServerTemplateInput } from "../schemas";
import { TransportType, AuthType } from "@tumiki/db";

describe("deleteMcpServerTemplate", () => {
  let mockContext: ProtectedContext;
  const testOrganizationId = "org-123";
  const officialOrganizationId = "official-org";

  beforeEach(() => {
    vi.stubEnv("OFFICIAL_ORGANIZATION_ID", officialOrganizationId);

    mockContext = {
      currentOrg: {
        id: testOrganizationId,
        name: "Test Organization",
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "OWNER",
      },
      db: {
        mcpServerTemplate: {
          findFirst: vi.fn(),
          delete: vi.fn(),
        },
      },
      session: {
        user: {
          id: "user-123",
          role: "SYSTEM_ADMIN",
        },
      },
    } as unknown as ProtectedContext;
  });

  test("SYSTEM_ADMIN権限で削除できること", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Template to Delete",
      normalizedName: "template-to-delete",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "node",
      args: [],
      url: null,
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      createdBy: "user-123",
      visibility: "PRIVATE",
      organizationId: testOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        templateInstances: 0,
      },
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.delete).mockResolvedValue(
      existingTemplate as never,
    );

    const input: DeleteMcpServerTemplateInput = {
      id: "template-1",
    };

    const result = await deleteMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual({ success: true });
    expect(mockContext.db.mcpServerTemplate.delete).toHaveBeenCalledWith({
      where: { id: "template-1" },
    });
  });

  test("USER権限では拒否されること（FORBIDDEN）", async () => {
    const userContext = {
      ...mockContext,
      session: {
        user: {
          id: "user-123",
          role: "USER",
        },
      },
    } as ProtectedContext;

    const input: DeleteMcpServerTemplateInput = {
      id: "template-1",
    };

    await expect(
      deleteMcpServerTemplate({ input, ctx: userContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      deleteMcpServerTemplate({ input, ctx: userContext }),
    ).rejects.toThrow("システム管理者のみが実行できる操作です");
  });

  test("自組織のテンプレートのみ削除可能", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Template to Delete",
      normalizedName: "template-to-delete",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "node",
      args: [],
      url: null,
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      createdBy: "user-123",
      visibility: "PRIVATE",
      organizationId: testOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        templateInstances: 0,
      },
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.delete).mockResolvedValue(
      existingTemplate as never,
    );

    const input: DeleteMcpServerTemplateInput = {
      id: "template-1",
    };

    await deleteMcpServerTemplate({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: "template-1",
        organizationId: testOrganizationId,
      },
      include: {
        _count: {
          select: {
            templateInstances: true,
          },
        },
      },
    });
  });

  test("公式組織のテンプレートは削除不可", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      null,
    );

    const input: DeleteMcpServerTemplateInput = {
      id: "official-template",
    };

    await expect(
      deleteMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      deleteMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("MCPサーバーテンプレートが見つかりません");
  });

  test("依存関係チェック（templateInstancesが存在する場合は削除不可）", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Template with Instances",
      normalizedName: "template-with-instances",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "node",
      args: [],
      url: null,
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      createdBy: "user-123",
      visibility: "PRIVATE",
      organizationId: testOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        templateInstances: 2,
      },
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );

    const input: DeleteMcpServerTemplateInput = {
      id: "template-1",
    };

    await expect(
      deleteMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      deleteMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("このテンプレートは使用中のため削除できません");

    expect(mockContext.db.mcpServerTemplate.delete).not.toHaveBeenCalled();
  });

  test("存在しないIDでエラーになること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      null,
    );

    const input: DeleteMcpServerTemplateInput = {
      id: "non-existent-id",
    };

    await expect(
      deleteMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      deleteMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("MCPサーバーテンプレートが見つかりません");

    expect(mockContext.db.mcpServerTemplate.delete).not.toHaveBeenCalled();
  });

  test("templateInstancesが0の場合は削除可能", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Template with No Instances",
      normalizedName: "template-with-no-instances",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "node",
      args: [],
      url: null,
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      createdBy: "user-123",
      visibility: "PRIVATE",
      organizationId: testOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        templateInstances: 0,
      },
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.delete).mockResolvedValue(
      existingTemplate as never,
    );

    const input: DeleteMcpServerTemplateInput = {
      id: "template-1",
    };

    const result = await deleteMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual({ success: true });
    expect(mockContext.db.mcpServerTemplate.delete).toHaveBeenCalledWith({
      where: { id: "template-1" },
    });
  });
});
