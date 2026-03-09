import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { updateMcpServerTemplate } from "../update.ee";
import type { ProtectedContext } from "@/server/api/trpc";
import type { UpdateMcpServerTemplateInput } from "../schemas";
import { TransportType, AuthType } from "@tumiki/db";

describe("updateMcpServerTemplate", () => {
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
          findUnique: vi.fn(),
          update: vi.fn(),
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

  test("SYSTEM_ADMIN権限で更新できること", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Original Name",
      normalizedName: "original-name",
      description: "Original Description",
      tags: ["original"],
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
    };

    const updatedTemplate = {
      ...existingTemplate,
      name: "Updated Name",
      description: "Updated Description",
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.update).mockResolvedValue(
      updatedTemplate as never,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      name: "Updated Name",
      description: "Updated Description",
    };

    const result = await updateMcpServerTemplate({ input, ctx: mockContext });

    expect(result.name).toStrictEqual("Updated Name");
    expect(result.description).toStrictEqual("Updated Description");
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

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      name: "Updated Name",
    };

    await expect(
      updateMcpServerTemplate({ input, ctx: userContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      updateMcpServerTemplate({ input, ctx: userContext }),
    ).rejects.toThrow("システム管理者のみが実行できる操作です");
  });

  test("自組織のテンプレートのみ更新可能", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Original Name",
      normalizedName: "original-name",
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
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.update).mockResolvedValue(
      existingTemplate as never,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      name: "Updated Name",
    };

    await updateMcpServerTemplate({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: "template-1",
        organizationId: testOrganizationId,
      },
    });
  });

  test("公式組織のテンプレートは更新不可", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      null,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "official-template",
      name: "Updated Name",
    };

    await expect(
      updateMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      updateMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("MCPサーバーテンプレートが見つかりません");
  });

  test("normalizedName重複チェック", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Original Name",
      normalizedName: "original-name",
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
    };

    const duplicateTemplate = {
      id: "template-2",
      normalizedName: "duplicate-name",
      organizationId: testOrganizationId,
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      duplicateTemplate as never,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      normalizedName: "duplicate-name",
    };

    await expect(
      updateMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      updateMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("同じ識別子のテンプレートが既に存在します");

    expect(mockContext.db.mcpServerTemplate.findUnique).toHaveBeenCalledWith({
      where: {
        normalizedName_organizationId: {
          normalizedName: "duplicate-name",
          organizationId: testOrganizationId,
        },
      },
    });
  });

  test("normalizedNameが変更されない場合は重複チェックをスキップ", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Original Name",
      normalizedName: "original-name",
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
    };

    const updatedTemplate = {
      ...existingTemplate,
      name: "Updated Name",
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.update).mockResolvedValue(
      updatedTemplate as never,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      name: "Updated Name",
    };

    await updateMcpServerTemplate({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findUnique).not.toHaveBeenCalled();
  });

  test("存在しないIDでエラーになること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      null,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "non-existent-id",
      name: "Updated Name",
    };

    await expect(
      updateMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      updateMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("MCPサーバーテンプレートが見つかりません");
  });

  test("部分更新が正しく動作すること", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Original Name",
      normalizedName: "original-name",
      description: "Original Description",
      tags: ["tag1"],
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
    };

    const updatedTemplate = {
      ...existingTemplate,
      tags: ["tag1", "tag2"],
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.update).mockResolvedValue(
      updatedTemplate as never,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      tags: ["tag1", "tag2"],
    };

    const result = await updateMcpServerTemplate({ input, ctx: mockContext });

    expect(result.tags).toStrictEqual(["tag1", "tag2"]);
    expect(mockContext.db.mcpServerTemplate.update).toHaveBeenCalledWith({
      where: { id: "template-1" },
      data: {
        tags: ["tag1", "tag2"],
      },
    });
  });

  test("複数フィールドの更新が正しく動作すること", async () => {
    const existingTemplate = {
      id: "template-1",
      name: "Original Name",
      normalizedName: "original-name",
      description: "Original Description",
      tags: ["tag1"],
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
    };

    const updatedTemplate = {
      ...existingTemplate,
      name: "Updated Name",
      description: "Updated Description",
      tags: ["tag2"],
      command: "python",
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      existingTemplate as never,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.update).mockResolvedValue(
      updatedTemplate as never,
    );

    const input: UpdateMcpServerTemplateInput = {
      id: "template-1",
      name: "Updated Name",
      description: "Updated Description",
      tags: ["tag2"],
      command: "python",
    };

    const result = await updateMcpServerTemplate({ input, ctx: mockContext });

    expect(result.name).toStrictEqual("Updated Name");
    expect(result.description).toStrictEqual("Updated Description");
    expect(result.tags).toStrictEqual(["tag2"]);
    expect(result.command).toStrictEqual("python");
  });
});
