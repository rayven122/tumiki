import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { createIntegratedMcpServer } from "../createIntegratedMcpServer";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerTemplate, McpTool } from "@tumiki/db/server";
import type { ToolId } from "@/schema/ids";

// テスト用のモック型定義
type MockMcpServerTemplate = Pick<
  McpServerTemplate,
  "id" | "name" | "envVarKeys"
> & {
  mcpTools: Array<Pick<McpTool, "id">>;
};

describe("createIntegratedMcpServer", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      mcpServerTemplate: {
        findUnique: vi.fn(),
      },
      mcpServerTemplateInstance: {
        findFirst: vi.fn(),
      },
      mcpServer: {
        create: vi.fn(),
      },
      organizationMember: {
        findMany: vi.fn(),
      },
      notification: {
        createMany: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("2つのテンプレートから統合サーバーを作成できる", async () => {
    // モックデータのセットアップ
    const mockTemplate1 = {
      id: "template-1",
      name: "GitHub",
      envVarKeys: [],
      mcpTools: [{ id: "tool-1" }, { id: "tool-2" }],
    } as MockMcpServerTemplate;

    const mockTemplate2 = {
      id: "template-2",
      name: "Slack",
      envVarKeys: [],
      mcpTools: [{ id: "tool-3" }, { id: "tool-4" }],
    } as MockMcpServerTemplate;

    const mockCreatedServer = {
      id: "integrated-server-123",
      name: "統合サーバー",
      description: "GitHub と Slack の統合",
      iconPath: null,
      serverStatus: "RUNNING",
      serverType: "CUSTOM",
      authType: "OAUTH",
      organizationId: testOrganizationId,
      displayOrder: 0,
    };

    vi.mocked(mockTx.mcpServerTemplate.findUnique)
      .mockResolvedValueOnce(
        mockTemplate1 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      )
      .mockResolvedValueOnce(
        mockTemplate2 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      );

    // envVarsが未指定の場合、既存インスタンスを探すがnullを返す
    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    vi.mocked(mockTx.mcpServer.create).mockResolvedValue(
      mockCreatedServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.create>
      >,
    );

    // 通知作成のモック（空の配列を返して通知をスキップ）
    vi.mocked(mockTx.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(mockTx.notification.createMany).mockResolvedValue({ count: 0 });

    // 実行
    const result = await createIntegratedMcpServer(
      mockTx,
      {
        name: "統合サーバー",
        slug: "integrated-server",
        description: "GitHub と Slack の統合",
        templates: [
          {
            mcpServerTemplateId: "template-1",
            normalizedName: "github-work",
            toolIds: ["tool-1" as ToolId, "tool-2" as ToolId],
          },
          {
            mcpServerTemplateId: "template-2",
            normalizedName: "slack-team",
            toolIds: ["tool-3" as ToolId, "tool-4" as ToolId],
          },
        ],
      },
      testOrganizationId,
      testUserId,
    );

    // 検証
    expect(result).toStrictEqual({
      id: "integrated-server-123",
    });

    expect(mockTx.mcpServerTemplate.findUnique).toHaveBeenCalledTimes(2);
    expect(mockTx.mcpServer.create).toHaveBeenCalledWith({
      data: {
        name: "統合サーバー",
        slug: "integrated-server",
        description: "GitHub と Slack の統合",
        iconPath: null,
        serverStatus: "RUNNING",
        serverType: "CUSTOM",
        authType: "OAUTH",
        organizationId: testOrganizationId,
        displayOrder: 0,
        templateInstances: {
          create: [
            {
              mcpServerTemplateId: "template-1",
              normalizedName: "github-work",
              isEnabled: true,
              displayOrder: 0,
              allowedTools: {
                connect: [{ id: "tool-1" }, { id: "tool-2" }],
              },
            },
            {
              mcpServerTemplateId: "template-2",
              normalizedName: "slack-team",
              isEnabled: true,
              displayOrder: 1,
              allowedTools: {
                connect: [{ id: "tool-3" }, { id: "tool-4" }],
              },
            },
          ],
        },
      },
    });
  });

  test("ツール選択が正しく反映される", async () => {
    // 一部ツールのみを選択
    const mockTemplate = {
      id: "template-1",
      name: "GitHub",
      envVarKeys: [],
      mcpTools: [{ id: "tool-1" }, { id: "tool-2" }, { id: "tool-3" }],
    } as MockMcpServerTemplate;

    const mockTemplate2 = {
      id: "template-2",
      name: "Slack",
      envVarKeys: [],
      mcpTools: [{ id: "tool-4" }, { id: "tool-5" }],
    } as MockMcpServerTemplate;

    const mockCreatedServer = {
      id: "integrated-server-123",
    };

    vi.mocked(mockTx.mcpServerTemplate.findUnique)
      .mockResolvedValueOnce(
        mockTemplate as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      )
      .mockResolvedValueOnce(
        mockTemplate2 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      );

    // envVarsが未指定の場合、既存インスタンスを探すがnullを返す
    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    vi.mocked(mockTx.mcpServer.create).mockResolvedValue(
      mockCreatedServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.create>
      >,
    );

    // 通知作成のモック（空の配列を返して通知をスキップ）
    vi.mocked(mockTx.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(mockTx.notification.createMany).mockResolvedValue({ count: 0 });

    // 実行（一部ツールのみ選択）
    await createIntegratedMcpServer(
      mockTx,
      {
        name: "統合サーバー",
        slug: "integrated-server-tools",
        templates: [
          {
            mcpServerTemplateId: "template-1",
            normalizedName: "github-work",
            toolIds: ["tool-1" as ToolId], // tool-1 のみ選択
          },
          {
            mcpServerTemplateId: "template-2",
            normalizedName: "slack-team",
            toolIds: ["tool-5" as ToolId], // tool-5 のみ選択
          },
        ],
      },
      testOrganizationId,
      testUserId,
    );

    // 検証: allowedToolsが選択したツールのみ
    expect(mockTx.mcpServer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          templateInstances: {
            create: [
              expect.objectContaining({
                allowedTools: {
                  connect: [{ id: "tool-1" }],
                },
              }),
              expect.objectContaining({
                allowedTools: {
                  connect: [{ id: "tool-5" }],
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  test("環境変数が正しく保存される", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "GitHub",
      envVarKeys: ["GITHUB_TOKEN"],
      mcpTools: [{ id: "tool-1" }],
    } as MockMcpServerTemplate;

    const mockTemplate2 = {
      id: "template-2",
      name: "Slack",
      envVarKeys: ["SLACK_TOKEN"],
      mcpTools: [{ id: "tool-2" }],
    } as MockMcpServerTemplate;

    const mockCreatedServer = {
      id: "integrated-server-123",
    };

    vi.mocked(mockTx.mcpServerTemplate.findUnique)
      .mockResolvedValueOnce(
        mockTemplate as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      )
      .mockResolvedValueOnce(
        mockTemplate2 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      );

    // envVarsが指定されているため、findFirstは呼ばれないが念のため設定
    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    vi.mocked(mockTx.mcpServer.create).mockResolvedValue(
      mockCreatedServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.create>
      >,
    );

    // 通知作成のモック（空の配列を返して通知をスキップ）
    vi.mocked(mockTx.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(mockTx.notification.createMany).mockResolvedValue({ count: 0 });

    // 実行（envVars付き）
    await createIntegratedMcpServer(
      mockTx,
      {
        name: "統合サーバー",
        slug: "integrated-server-envvars",
        templates: [
          {
            mcpServerTemplateId: "template-1",
            normalizedName: "github-work",
            toolIds: ["tool-1" as ToolId],
            envVars: { GITHUB_TOKEN: "ghp_xxx" },
          },
          {
            mcpServerTemplateId: "template-2",
            normalizedName: "slack-team",
            toolIds: ["tool-2" as ToolId],
            envVars: { SLACK_TOKEN: "xoxb-xxx" },
          },
        ],
      },
      testOrganizationId,
      testUserId,
    );

    // 検証: McpConfig作成、暗号化されたenvVars
    expect(mockTx.mcpServer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          templateInstances: {
            create: [
              expect.objectContaining({
                mcpConfigs: {
                  create: {
                    organizationId: testOrganizationId,
                    userId: testUserId,
                    envVars: JSON.stringify({ GITHUB_TOKEN: "ghp_xxx" }),
                  },
                },
              }),
              expect.objectContaining({
                mcpConfigs: {
                  create: {
                    organizationId: testOrganizationId,
                    userId: testUserId,
                    envVars: JSON.stringify({ SLACK_TOKEN: "xoxb-xxx" }),
                  },
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  test("テンプレートが見つからない場合はエラー", async () => {
    vi.mocked(mockTx.mcpServerTemplate.findUnique).mockResolvedValue(null);
    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    // 実行 & 検証
    await expect(
      createIntegratedMcpServer(
        mockTx,
        {
          name: "統合サーバー",
          slug: "integrated-server-invalid",
          templates: [
            {
              mcpServerTemplateId: "invalid-template",
              normalizedName: "test",
              toolIds: ["tool-1" as ToolId],
            },
            {
              mcpServerTemplateId: "template-2",
              normalizedName: "test2",
              toolIds: ["tool-2" as ToolId],
            },
          ],
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(TRPCError);
  });

  test("無効なツールIDが含まれている場合はエラー", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "GitHub",
      envVarKeys: [],
      mcpTools: [{ id: "tool-1" }, { id: "tool-2" }],
    } as MockMcpServerTemplate;

    const mockTemplate2 = {
      id: "template-2",
      name: "Slack",
      envVarKeys: [],
      mcpTools: [{ id: "tool-3" }],
    } as MockMcpServerTemplate;

    vi.mocked(mockTx.mcpServerTemplate.findUnique)
      .mockResolvedValueOnce(
        mockTemplate as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      )
      .mockResolvedValueOnce(
        mockTemplate2 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      );

    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    // 実行 & 検証（存在しないツールIDを指定）
    await expect(
      createIntegratedMcpServer(
        mockTx,
        {
          name: "統合サーバー",
          slug: "integrated-server-invalid-tool",
          templates: [
            {
              mcpServerTemplateId: "template-1",
              normalizedName: "github",
              toolIds: ["tool-1" as ToolId, "invalid-tool" as ToolId], // invalid-toolは存在しない
            },
            {
              mcpServerTemplateId: "template-2",
              normalizedName: "slack",
              toolIds: ["tool-3" as ToolId],
            },
          ],
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(TRPCError);
  });

  test("toolIds省略時はテンプレートの全ツールが自動選択される", async () => {
    // モックデータのセットアップ（3つのツールを持つテンプレート）
    const mockTemplate1 = {
      id: "template-1",
      name: "GitHub",
      envVarKeys: [],
      mcpTools: [{ id: "tool-1" }, { id: "tool-2" }, { id: "tool-3" }],
    } as MockMcpServerTemplate;

    const mockTemplate2 = {
      id: "template-2",
      name: "Slack",
      envVarKeys: [],
      mcpTools: [{ id: "tool-4" }, { id: "tool-5" }],
    } as MockMcpServerTemplate;

    const mockCreatedServer = {
      id: "integrated-server-123",
    };

    vi.mocked(mockTx.mcpServerTemplate.findUnique)
      .mockResolvedValueOnce(
        mockTemplate1 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      )
      .mockResolvedValueOnce(
        mockTemplate2 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      );

    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    vi.mocked(mockTx.mcpServer.create).mockResolvedValue(
      mockCreatedServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.create>
      >,
    );

    vi.mocked(mockTx.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(mockTx.notification.createMany).mockResolvedValue({ count: 0 });

    // 実行（toolIdsを省略）
    await createIntegratedMcpServer(
      mockTx,
      {
        name: "統合サーバー",
        slug: "integrated-server-all-tools",
        templates: [
          {
            mcpServerTemplateId: "template-1",
            normalizedName: "github-work",
            // toolIds省略 - 全ツールが自動選択されるべき
          },
          {
            mcpServerTemplateId: "template-2",
            normalizedName: "slack-team",
            // toolIds省略 - 全ツールが自動選択されるべき
          },
        ],
      },
      testOrganizationId,
      testUserId,
    );

    // 検証: allowedToolsにテンプレートの全ツールが含まれる
    expect(mockTx.mcpServer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          templateInstances: {
            create: [
              expect.objectContaining({
                allowedTools: {
                  connect: [
                    { id: "tool-1" },
                    { id: "tool-2" },
                    { id: "tool-3" },
                  ],
                },
              }),
              expect.objectContaining({
                allowedTools: {
                  connect: [{ id: "tool-4" }, { id: "tool-5" }],
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  test("環境変数が一致しない場合はエラー", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "GitHub",
      envVarKeys: ["GITHUB_TOKEN"],
      mcpTools: [{ id: "tool-1" }],
    } as MockMcpServerTemplate;

    const mockTemplate2 = {
      id: "template-2",
      name: "Slack",
      envVarKeys: [],
      mcpTools: [{ id: "tool-2" }],
    } as MockMcpServerTemplate;

    vi.mocked(mockTx.mcpServerTemplate.findUnique)
      .mockResolvedValueOnce(
        mockTemplate as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      )
      .mockResolvedValueOnce(
        mockTemplate2 as unknown as Awaited<
          ReturnType<typeof mockTx.mcpServerTemplate.findUnique>
        >,
      );

    vi.mocked(mockTx.mcpServerTemplateInstance.findFirst).mockResolvedValue(
      null,
    );

    // 実行 & 検証（envVarKeysに存在しない環境変数を指定）
    await expect(
      createIntegratedMcpServer(
        mockTx,
        {
          name: "統合サーバー",
          slug: "integrated-server-invalid-env",
          templates: [
            {
              mcpServerTemplateId: "template-1",
              normalizedName: "github",
              toolIds: ["tool-1" as ToolId],
              envVars: { INVALID_KEY: "value" }, // INVALID_KEYは存在しない
            },
            {
              mcpServerTemplateId: "template-2",
              normalizedName: "slack",
              toolIds: ["tool-2" as ToolId],
            },
          ],
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(TRPCError);
  });
});
