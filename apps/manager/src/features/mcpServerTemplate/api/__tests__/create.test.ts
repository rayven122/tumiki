import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { createMcpServerTemplate } from "../create.ee";
import type { ProtectedContext } from "@/server/api/trpc";
import type { CreateMcpServerTemplateInput } from "../schemas";
import { TransportType, AuthType } from "@tumiki/db";

describe("createMcpServerTemplate", () => {
  let mockContext: ProtectedContext;
  const testOrganizationId = "org-123";

  beforeEach(() => {
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
          findUnique: vi.fn(),
          create: vi.fn(),
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

  test("SYSTEM_ADMIN権限で作成できること", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "New Template",
      normalizedName: "new-template",
      description: "Test Description",
      tags: ["test"],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "node",
      args: ["index.js"],
      url: null,
      envVarKeys: ["API_KEY"],
      authType: AuthType.API_KEY,
      oauthProvider: null,
      oauthScopes: [],
      useCloudRunIam: false,
      createdBy: "user-123",
      visibility: "PRIVATE",
      organizationId: testOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );
    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "New Template",
      normalizedName: "new-template",
      description: "Test Description",
      tags: ["test"],
      transportType: TransportType.STDIO,
      command: "node",
      args: ["index.js"],
      envVarKeys: ["API_KEY"],
      authType: AuthType.API_KEY,
      visibility: "PRIVATE",
      oauthScopes: [],
      useCloudRunIam: false,
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplate);
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

    const input: CreateMcpServerTemplateInput = {
      name: "New Template",
      normalizedName: "new-template",
      transportType: TransportType.STDIO,
      command: "node",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    await expect(
      createMcpServerTemplate({ input, ctx: userContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      createMcpServerTemplate({ input, ctx: userContext }),
    ).rejects.toThrow("システム管理者のみが実行できる操作です");
  });

  test("STDIO: command必須の検証", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );

    const mockTemplate = {
      id: "template-1",
      name: "STDIO Template",
      normalizedName: "stdio-template",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "npx",
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

    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "STDIO Template",
      normalizedName: "stdio-template",
      transportType: TransportType.STDIO,
      command: "npx",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplate);
  });

  test("SSE: url必須の検証", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );

    const mockTemplate = {
      id: "template-2",
      name: "SSE Template",
      normalizedName: "sse-template",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.SSE,
      command: null,
      args: [],
      url: "https://api.example.com",
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

    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "SSE Template",
      normalizedName: "sse-template",
      transportType: TransportType.SSE,
      url: "https://api.example.com",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplate);
  });

  test("HTTPS: url必須の検証", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );

    const mockTemplate = {
      id: "template-3",
      name: "HTTPS Template",
      normalizedName: "https-template",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STREAMABLE_HTTPS,
      command: null,
      args: [],
      url: "https://api.example.com",
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

    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "HTTPS Template",
      normalizedName: "https-template",
      transportType: TransportType.STREAMABLE_HTTPS,
      url: "https://api.example.com",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplate);
  });

  test("コマンドホワイトリスト検証（npx）", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );

    const mockTemplate = {
      id: "template-4",
      name: "NPX Template",
      normalizedName: "npx-template",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "npx",
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

    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "NPX Template",
      normalizedName: "npx-template",
      transportType: TransportType.STDIO,
      command: "npx",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result.command).toStrictEqual("npx");
  });

  test("コマンドホワイトリスト検証（python）", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );

    const mockTemplate = {
      id: "template-5",
      name: "Python Template",
      normalizedName: "python-template",
      description: null,
      tags: [],
      iconPath: null,
      transportType: TransportType.STDIO,
      command: "python",
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

    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "Python Template",
      normalizedName: "python-template",
      transportType: TransportType.STDIO,
      command: "python",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result.command).toStrictEqual("python");
  });

  test("重複チェック（normalizedName + organizationId）", async () => {
    const existingTemplate = {
      id: "existing-template",
      name: "Existing Template",
      normalizedName: "duplicate-template",
      organizationId: testOrganizationId,
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      existingTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "Duplicate Template",
      normalizedName: "duplicate-template",
      transportType: TransportType.STDIO,
      command: "node",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    await expect(
      createMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      createMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("同じ識別子のテンプレートが既に存在します");

    expect(mockContext.db.mcpServerTemplate.findUnique).toHaveBeenCalledWith({
      where: {
        normalizedName_organizationId: {
          normalizedName: "duplicate-template",
          organizationId: testOrganizationId,
        },
      },
    });
  });

  test("normalizedName が正しく適用されること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findUnique).mockResolvedValue(
      null,
    );

    const mockTemplate = {
      id: "template-6",
      name: "Normalized Name Test",
      normalizedName: "normalized-name-test",
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

    vi.mocked(mockContext.db.mcpServerTemplate.create).mockResolvedValue(
      mockTemplate as never,
    );

    const input: CreateMcpServerTemplateInput = {
      name: "Normalized Name Test",
      normalizedName: "normalized-name-test",
      transportType: TransportType.STDIO,
      command: "node",
      tags: [],
      args: [],
      envVarKeys: [],
      authType: AuthType.NONE,
      oauthScopes: [],
      useCloudRunIam: false,
      visibility: "PRIVATE",
    };

    const result = await createMcpServerTemplate({ input, ctx: mockContext });

    expect(result.normalizedName).toStrictEqual("normalized-name-test");
  });
});
