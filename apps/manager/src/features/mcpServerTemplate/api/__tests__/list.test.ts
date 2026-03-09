import { describe, test, expect, beforeEach, vi } from "vitest";
import { listMcpServerTemplates } from "../list";
import type { ProtectedContext } from "@/server/api/trpc";
import type { ListMcpServerTemplatesInput } from "../schemas";
import { TransportType, AuthType } from "@tumiki/db";

describe("listMcpServerTemplates", () => {
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
      },
      db: {
        mcpServerTemplate: {
          findMany: vi.fn(),
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

  test("自組織のテンプレートのみ取得できること", async () => {
    const mockTemplates = [
      {
        id: "template-1",
        name: "Template 1",
        normalizedName: "template-1",
        description: "Description 1",
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
      },
    ];

    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      mockTemplates as never,
    );

    const input: ListMcpServerTemplatesInput = {};

    const result = await listMcpServerTemplates({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplates);
    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("公式組織のテンプレートも取得できること", async () => {
    const mockTemplates = [
      {
        id: "official-template-1",
        name: "Official Template",
        normalizedName: "official-template",
        description: "Official Description",
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
        createdBy: null,
        visibility: "PUBLIC",
        organizationId: officialOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      mockTemplates as never,
    );

    const input: ListMcpServerTemplatesInput = {};

    const result = await listMcpServerTemplates({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplates);
  });

  test("他組織のテンプレートは取得できないこと", async () => {
    const mockTemplates = [
      {
        id: "template-1",
        name: "My Template",
        normalizedName: "my-template",
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
      },
    ];

    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      mockTemplates as never,
    );

    const input: ListMcpServerTemplatesInput = {};

    await listMcpServerTemplates({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("transportType フィルターが正常に動作すること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      [] as never,
    );

    const input: ListMcpServerTemplatesInput = {
      transportType: TransportType.STDIO,
    };

    await listMcpServerTemplates({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
        transportType: TransportType.STDIO,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("authType フィルターが正常に動作すること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      [] as never,
    );

    const input: ListMcpServerTemplatesInput = {
      authType: AuthType.OAUTH,
    };

    await listMcpServerTemplates({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
        authType: AuthType.OAUTH,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("検索（名前・説明）が正常に動作すること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      [] as never,
    );

    const input: ListMcpServerTemplatesInput = {
      search: "github",
    };

    await listMcpServerTemplates({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
        OR: [
          { name: { contains: "github", mode: "insensitive" } },
          { description: { contains: "github", mode: "insensitive" } },
          { normalizedName: { contains: "github", mode: "insensitive" } },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("タグフィルターが正常に動作すること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      [] as never,
    );

    const input: ListMcpServerTemplatesInput = {
      tags: ["development", "github"],
    };

    await listMcpServerTemplates({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
        tags: { hasSome: ["development", "github"] },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("複数フィルターを組み合わせて使用できること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findMany).mockResolvedValue(
      [] as never,
    );

    const input: ListMcpServerTemplatesInput = {
      transportType: TransportType.SSE,
      authType: AuthType.API_KEY,
      search: "api",
      tags: ["production"],
    };

    await listMcpServerTemplates({ input, ctx: mockContext });

    expect(mockContext.db.mcpServerTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
        transportType: TransportType.SSE,
        authType: AuthType.API_KEY,
        OR: [
          { name: { contains: "api", mode: "insensitive" } },
          { description: { contains: "api", mode: "insensitive" } },
          { normalizedName: { contains: "api", mode: "insensitive" } },
        ],
        tags: { hasSome: ["production"] },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });
});
