import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { getMcpServerTemplate } from "../get";
import type { ProtectedContext } from "@/server/api/trpc";
import type { GetMcpServerTemplateInput } from "../schemas";
import { TransportType, AuthType } from "@tumiki/db";

describe("getMcpServerTemplate", () => {
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
          findFirst: vi.fn(),
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

  test("自組織のテンプレートを取得できること", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "My Template",
      normalizedName: "my-template",
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

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      mockTemplate as never,
    );

    const input: GetMcpServerTemplateInput = {
      id: "template-1",
    };

    const result = await getMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplate);
    expect(mockContext.db.mcpServerTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: "template-1",
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
      },
    });
  });

  test("公式組織のテンプレートを取得できること", async () => {
    const mockTemplate = {
      id: "official-template-1",
      name: "Official Template",
      normalizedName: "official-template",
      description: "Official Description",
      tags: ["official"],
      iconPath: "/icons/official.png",
      transportType: TransportType.SSE,
      command: null,
      args: [],
      url: "https://api.example.com",
      envVarKeys: [],
      authType: AuthType.OAUTH,
      oauthProvider: "github",
      oauthScopes: ["repo"],
      useCloudRunIam: false,
      createdBy: null,
      visibility: "PUBLIC",
      organizationId: officialOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      mockTemplate as never,
    );

    const input: GetMcpServerTemplateInput = {
      id: "official-template-1",
    };

    const result = await getMcpServerTemplate({ input, ctx: mockContext });

    expect(result).toStrictEqual(mockTemplate);
  });

  test("他組織のテンプレートは取得できないこと", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      null,
    );

    const input: GetMcpServerTemplateInput = {
      id: "other-org-template",
    };

    await expect(
      getMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      getMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("MCPサーバーテンプレートが見つかりません");
  });

  test("存在しないIDでエラーになること", async () => {
    vi.mocked(mockContext.db.mcpServerTemplate.findFirst).mockResolvedValue(
      null,
    );

    const input: GetMcpServerTemplateInput = {
      id: "non-existent-id",
    };

    await expect(
      getMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow(TRPCError);

    await expect(
      getMcpServerTemplate({ input, ctx: mockContext }),
    ).rejects.toThrow("MCPサーバーテンプレートが見つかりません");

    expect(mockContext.db.mcpServerTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: "non-existent-id",
        organizationId: { in: [testOrganizationId, officialOrganizationId] },
      },
    });
  });
});
