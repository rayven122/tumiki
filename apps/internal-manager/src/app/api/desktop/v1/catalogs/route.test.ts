import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockFindCatalogs = vi.hoisted(() => vi.fn());
const mockFindUser = vi.hoisted(() => vi.fn());
const mockFindOrgUnits = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: mockFindUser,
    },
    orgUnit: {
      findMany: mockFindOrgUnits,
    },
    mcpCatalog: {
      findMany: mockFindCatalogs,
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
  status: "ACTIVE",
  transportType: "STREAMABLE_HTTP",
  authType: "OAUTH",
  credentialKeys: ["GITHUB_TOKEN"],
  updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  tools: [
    {
      id: "tool-list-repos",
      name: "list_repos",
      description: "List repositories",
      updatedAt: new Date("2026-05-03T10:00:00.000Z"),
      orgUnitPermissions: [
        {
          orgUnitId: "org-001",
          effect: "ALLOW",
          updatedAt: new Date("2026-05-03T10:00:00.000Z"),
        },
      ],
    },
  ],
  ...overrides,
});

describe("GET /api/desktop/v1/catalogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyDesktopJwt.mockResolvedValue({ userId: "user-001" });
    mockFindUser.mockResolvedValue({
      id: "user-001",
      updatedAt: new Date("2026-05-03T10:00:00.000Z"),
      orgUnitMemberships: [
        {
          updatedAt: new Date("2026-05-03T10:00:00.000Z"),
          orgUnit: {
            id: "org-001",
            parentId: null,
            updatedAt: new Date("2026-05-03T10:00:00.000Z"),
          },
        },
      ],
      groupMemberships: [
        {
          group: {
            permissions: [],
          },
        },
      ],
      individualPermissions: [],
    });
    mockFindOrgUnits.mockResolvedValue([
      {
        id: "org-001",
        parentId: null,
        updatedAt: new Date("2026-05-03T10:00:00.000Z"),
      },
    ]);
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
          tools: [
            {
              name: "list_repos",
              description: "List repositories",
              allowed: true,
              deniedReason: null,
            },
          ],
        },
      ],
      nextCursor: null,
    });
    expect(response.status).toStrictEqual(200);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
  });

  test("権限評価はツール表示上限ではなく全ツールを対象にする", async () => {
    const tools = Array.from({ length: 11 }, (_, index) => ({
      id: `tool-${String(index + 1).padStart(2, "0")}`,
      name: `tool_${String(index + 1).padStart(2, "0")}`,
      description: `Tool ${index + 1}`,
      updatedAt: new Date("2026-05-03T10:00:00.000Z"),
      orgUnitPermissions:
        index === 10
          ? [
              {
                orgUnitId: "org-001",
                effect: "ALLOW",
                updatedAt: new Date("2026-05-03T10:00:00.000Z"),
              },
            ]
          : [],
    }));
    mockFindCatalogs.mockImplementationOnce((args: unknown) => {
      const toolSelect =
        typeof args === "object" &&
        args !== null &&
        "select" in args &&
        typeof args.select === "object" &&
        args.select !== null &&
        "tools" in args.select &&
        typeof args.select.tools === "object" &&
        args.select.tools !== null
          ? args.select.tools
          : {};
      const selectedTools =
        "take" in toolSelect && typeof toolSelect.take === "number"
          ? tools.slice(0, toolSelect.take)
          : tools;
      return Promise.resolve([buildCatalog({ tools: selectedTools })]);
    });

    const response = await GET(buildRequest());
    const body = (await response.json()) as {
      items: [{ status: string; tools: unknown[] }];
    };

    expect(body.items[0].status).toStrictEqual("available");
    expect(body.items[0].tools).toHaveLength(10);
  });

  test("権限がないカタログは申請必要として返す", async () => {
    mockFindUser.mockResolvedValue({
      id: "user-001",
      updatedAt: new Date("2026-05-03T10:00:00.000Z"),
      groupMemberships: [],
      orgUnitMemberships: [],
      individualPermissions: [],
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
    mockFindCatalogs.mockResolvedValue([buildCatalog({ status: "DISABLED" })]);

    const response = await GET(buildRequest());
    const body = (await response.json()) as { items: [{ status: string }] };

    expect(body.items[0].status).toStrictEqual("disabled");
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

    expect(body.nextCursor).toStrictEqual(expect.any(String));
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

  test("認証成功後にユーザーが存在しない場合は401を返す", async () => {
    mockFindUser.mockResolvedValue(null);

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockFindCatalogs).not.toHaveBeenCalled();
  });

  test("カタログ取得でDBエラーが発生した場合は500を返す", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockFindCatalogs.mockRejectedValue(new Error("DB error"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal Server Error",
    });
    expect(response.status).toStrictEqual(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch desktop MCP catalogs",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
