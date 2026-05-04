import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockFindCatalogs = vi.hoisted(() => vi.fn());
const mockFindUser = vi.hoisted(() => vi.fn());
const mockFindGroupToolPermissions = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpServer: {
      findMany: mockFindCatalogs,
    },
  },
}));

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: mockFindUser,
    },
    groupMcpToolPermission: {
      findMany: mockFindGroupToolPermissions,
    },
  },
}));

vi.mock("~/lib/auth/verify-desktop-jwt", () => ({
  verifyDesktopJwt: mockVerifyDesktopJwt,
}));

import { GET } from "./route";

const buildRequest = (search = "") =>
  new Request(`https://manager.example.com/api/desktop/v1/catalogs${search}`, {
    headers: {
      Authorization: "Bearer access-token",
    },
  }) as NextRequest;

const buildCatalog = (overrides: Record<string, unknown> = {}) => ({
  id: "server-github",
  slug: "github",
  name: "GitHub",
  description: "GitHub MCP",
  iconPath: "https://example.com/github.svg",
  serverStatus: "RUNNING",
  authType: "API_KEY",
  templateInstances: [
    {
      isEnabled: true,
      allowedTools: [{ name: "list_repos", description: "List repositories" }],
      mcpServerTemplate: {
        transportType: "STREAMABLE_HTTPS",
        authType: "OAUTH",
        command: null,
        args: [],
        url: "https://api.githubcopilot.com/mcp/",
        envVarKeys: ["GITHUB_TOKEN"],
        mcpTools: [
          { name: "list_repos", description: "List repositories" },
          { name: "create_issue", description: "Create an issue" },
        ],
      },
    },
  ],
  ...overrides,
});

describe("GET /api/desktop/v1/catalogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyDesktopJwt.mockResolvedValue({ userId: "user-001" });
    mockFindUser.mockResolvedValue({
      groupMemberships: [
        {
          groupId: "group-admin",
          group: {
            permissions: [
              {
                mcpServerId: "server-github",
                read: true,
                write: false,
                execute: true,
              },
            ],
          },
        },
      ],
      individualPermissions: [],
      mcpToolPermissions: [],
    });
    mockFindGroupToolPermissions.mockResolvedValue([]);
    mockFindCatalogs.mockResolvedValue([buildCatalog()]);
  });

  test("認証ユーザーが利用可能なカタログ一覧を返す", async () => {
    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      items: [
        {
          id: "github",
          name: "GitHub",
          description: "GitHub MCP",
          iconUrl: "https://example.com/github.svg",
          status: "available",
          permissions: { read: true, write: false, execute: true },
          transportType: "STREAMABLE_HTTP",
          authType: "OAUTH",
          requiredCredentialKeys: ["GITHUB_TOKEN"],
          connectionTemplate: {
            transportType: "STREAMABLE_HTTP",
            command: null,
            args: [],
            url: "https://api.githubcopilot.com/mcp/",
            authType: "OAUTH",
            credentialKeys: ["GITHUB_TOKEN"],
          },
          tools: [
            {
              name: "list_repos",
              description: "List repositories",
              allowed: true,
            },
          ],
        },
      ],
      nextCursor: null,
    });
    expect(response.status).toStrictEqual(200);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
  });

  test("connectionTemplateにcredential値を含めず、キーだけを返す", async () => {
    const response = await GET(buildRequest());
    const body = (await response.json()) as {
      items: [
        {
          connectionTemplate: { credentialKeys: string[] };
          requiredCredentialKeys: string[];
        },
      ];
    };

    expect(body.items[0].connectionTemplate.credentialKeys).toStrictEqual([
      "GITHUB_TOKEN",
    ]);
    expect(body.items[0].requiredCredentialKeys).toStrictEqual([
      "GITHUB_TOKEN",
    ]);
    expect(JSON.stringify(body)).not.toContain("access-token");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  test("権限がないカタログは申請必要として返す", async () => {
    mockFindUser.mockResolvedValue({
      groupMemberships: [],
      individualPermissions: [],
      mcpToolPermissions: [],
    });

    const response = await GET(buildRequest());
    const body = (await response.json()) as {
      items: [{ status: string; permissions: Record<string, boolean> }];
    };

    expect(body.items[0].status).toStrictEqual("request_required");
    expect(body.items[0].permissions).toStrictEqual({
      read: false,
      write: false,
      execute: false,
    });
  });

  test("停止中のカタログはdisabledとして返す", async () => {
    mockFindCatalogs.mockResolvedValue([
      buildCatalog({ serverStatus: "STOPPED" }),
    ]);

    const response = await GET(buildRequest());
    const body = (await response.json()) as { items: [{ status: string }] };

    expect(body.items[0].status).toStrictEqual("disabled");
  });

  test("McpConnection/McpToolのallowlist権限を反映する", async () => {
    mockFindCatalogs.mockResolvedValue([
      buildCatalog({
        templateInstances: [],
        connections: [
          {
            id: "conn-github",
            isEnabled: true,
            transportType: "STREAMABLE_HTTP",
            command: null,
            args: [],
            url: "https://api.githubcopilot.com/mcp/",
            credentialKeys: ["GITHUB_TOKEN"],
            authType: "BEARER",
            catalog: null,
            tools: [
              {
                id: "tool-list-repos",
                name: "list_repos",
                description: "List repositories",
                isAllowed: true,
                reviewStatus: "APPROVED",
              },
            ],
          },
        ],
      }),
    ]);
    mockFindGroupToolPermissions.mockResolvedValue([
      { mcpToolId: "tool-list-repos", canUse: true },
    ]);

    const response = await GET(buildRequest());
    const body = (await response.json()) as {
      items: [{ status: string; tools: [{ id: string; allowed: boolean }] }];
    };

    expect(body.items[0].status).toStrictEqual("available");
    expect(body.items[0].tools[0]).toMatchObject({
      id: "tool-list-repos",
      allowed: true,
    });
  });

  test("ユーザー個別ツール権限はグループ権限より優先される", async () => {
    mockFindUser.mockResolvedValue({
      groupMemberships: [
        {
          groupId: "group-admin",
          group: {
            permissions: [
              {
                mcpServerId: "server-github",
                read: true,
                write: false,
                execute: true,
              },
            ],
          },
        },
      ],
      individualPermissions: [],
      mcpToolPermissions: [{ mcpToolId: "tool-list-repos", canUse: false }],
    });
    mockFindCatalogs.mockResolvedValue([
      buildCatalog({
        templateInstances: [],
        connections: [
          {
            id: "conn-github",
            isEnabled: true,
            transportType: "STREAMABLE_HTTP",
            command: null,
            args: [],
            url: "https://api.githubcopilot.com/mcp/",
            credentialKeys: ["GITHUB_TOKEN"],
            authType: "BEARER",
            catalog: null,
            tools: [
              {
                id: "tool-list-repos",
                name: "list_repos",
                description: "List repositories",
                isAllowed: true,
                reviewStatus: "APPROVED",
              },
            ],
          },
        ],
      }),
    ]);
    mockFindGroupToolPermissions.mockResolvedValue([
      { mcpToolId: "tool-list-repos", canUse: true },
    ]);

    const response = await GET(buildRequest());
    const body = (await response.json()) as {
      items: [{ status: string; tools: [{ allowed: boolean }] }];
    };

    expect(body.items[0].status).toStrictEqual("disabled");
    expect(body.items[0].tools[0].allowed).toBe(false);
  });

  test("limitを検証し、最大件数を超える場合は400を返す", async () => {
    const response = await GET(buildRequest("?limit=201"));

    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid query",
    });
    expect(response.status).toStrictEqual(400);
    expect(mockFindCatalogs).not.toHaveBeenCalled();
  });

  test("不正なcursorは400を返す", async () => {
    const response = await GET(buildRequest("?cursor=invalid"));

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid cursor",
    });
    expect(response.status).toStrictEqual(400);
    expect(mockFindCatalogs).not.toHaveBeenCalled();
  });

  test("次ページがある場合はopaque cursorを返す", async () => {
    mockFindCatalogs.mockResolvedValue([
      buildCatalog({ id: "server-github", slug: "github", name: "GitHub" }),
      buildCatalog({ id: "server-slack", slug: "slack", name: "Slack" }),
    ]);

    const response = await GET(buildRequest("?limit=1"));
    const body = (await response.json()) as { nextCursor: string | null };

    expect(body.nextCursor).toEqual(expect.any(String));
  });

  test("cursor指定時は名前とIDのkeyset条件で次ページを取得する", async () => {
    const cursor = Buffer.from(
      JSON.stringify({ id: "server-github", name: "GitHub" }),
      "utf8",
    ).toString("base64url");

    await GET(buildRequest(`?cursor=${cursor}`));

    expect(mockFindCatalogs).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          OR: [
            { name: { gt: "GitHub" } },
            { name: "GitHub", id: { gt: "server-github" } },
          ],
        },
      }),
    );
  });

  test("認証に失敗した場合は401を返す", async () => {
    mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockFindUser).not.toHaveBeenCalled();
    expect(mockFindCatalogs).not.toHaveBeenCalled();
  });
});
