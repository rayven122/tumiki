import { describe, test, expect, beforeEach, vi } from "vitest";
import type { McpCatalog } from "@prisma/desktop-client";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../catalog.repository");
vi.mock("../../../shared/manager-api-client", () => ({
  requestManagerApi: vi.fn(),
}));
vi.mock("../../../shared/profile-dispatch", () => ({
  resolveByProfile: vi.fn(),
}));
vi.mock("../../mcp-server-list/mcp.service", () => ({
  createFromCatalog: vi.fn(),
  createFromManagerCatalog: vi.fn(),
}));

// テスト対象のインポート（モックの後に行う）
import * as catalogService from "../catalog.service";
import { getDb } from "../../../shared/db";
import * as catalogRepository from "../catalog.repository";
import { requestManagerApi } from "../../../shared/manager-api-client";
import { resolveByProfile } from "../../../shared/profile-dispatch";
import {
  createFromCatalog,
  createFromManagerCatalog,
} from "../../mcp-server-list/mcp.service";
import type { AddFromCatalogInput } from "../catalog.types";

const managerCatalog = {
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
    { name: "list_repos", description: "List repositories", allowed: true },
  ],
} as const;

const localCatalog: McpCatalog = {
  id: 1,
  name: "Filesystem",
  description: "ファイルシステム操作",
  iconPath: "/logos/services/filesystem.svg",
  transportType: "STDIO",
  command: "npx",
  args: '["-y", "@modelcontextprotocol/server-filesystem"]',
  url: null,
  credentialKeys: "[]",
  authType: "NONE",
  isOfficial: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const response = (
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("catalog.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getAllCatalogs", () => {
    describe("組織利用モード", () => {
      beforeEach(() => {
        vi.mocked(resolveByProfile).mockImplementation(async (handlers) =>
          handlers.organization(),
        );
      });

      test("Manager APIから全ページのカタログを取得する", async () => {
        vi.mocked(requestManagerApi)
          .mockResolvedValueOnce(
            response({ items: [managerCatalog], nextCursor: "cursor-1" }),
          )
          .mockResolvedValueOnce(
            response({
              items: [{ ...managerCatalog, id: "slack", name: "Slack" }],
              nextCursor: null,
            }),
          );

        const result = await catalogService.getAllCatalogs();

        expect(result).toHaveLength(2);
        expect(requestManagerApi).toHaveBeenNthCalledWith(
          1,
          "/api/desktop/v1/catalogs?limit=200",
        );
        expect(requestManagerApi).toHaveBeenNthCalledWith(
          2,
          "/api/desktop/v1/catalogs?limit=200&cursor=cursor-1",
        );
        expect(catalogRepository.findAll).not.toHaveBeenCalled();
      });

      test("Manager未接続時はエラーにする", async () => {
        vi.mocked(requestManagerApi).mockResolvedValueOnce(null);

        await expect(catalogService.getAllCatalogs()).rejects.toThrow(
          "管理サーバーに接続またはログインされていません",
        );
        expect(catalogRepository.findAll).not.toHaveBeenCalled();
      });

      test("Manager APIエラー時はエラーにする", async () => {
        vi.mocked(requestManagerApi).mockResolvedValueOnce(
          response({ error: "Unauthorized" }, { ok: false, status: 401 }),
        );

        await expect(catalogService.getAllCatalogs()).rejects.toThrow(
          "管理サーバーのカタログ取得に失敗しました (401)",
        );
        expect(catalogRepository.findAll).not.toHaveBeenCalled();
      });

      test("不正レスポンスはエラーにする", async () => {
        vi.mocked(requestManagerApi).mockResolvedValueOnce(
          response({ items: [{ id: "broken" }], nextCursor: null }),
        );

        await expect(catalogService.getAllCatalogs()).rejects.toThrow();
      });
    });

    describe("個人利用モード", () => {
      beforeEach(() => {
        vi.mocked(resolveByProfile).mockImplementation(async (handlers) =>
          handlers.personal(),
        );
      });

      test("ローカルSQLiteからカタログを取得しCatalogItem型に変換する", async () => {
        vi.mocked(catalogRepository.findAll).mockResolvedValue([localCatalog]);

        const result = await catalogService.getAllCatalogs();

        expect(result).toHaveLength(1);
        expect(result[0]).toStrictEqual({
          id: "1",
          name: "Filesystem",
          description: "ファイルシステム操作",
          iconUrl: "/logos/services/filesystem.svg",
          status: "available",
          permissions: { read: true, write: true, execute: true },
          transportType: "STDIO",
          authType: "NONE",
          requiredCredentialKeys: [],
          tools: [],
          connectionTemplate: {
            transportType: "STDIO",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem"],
            url: null,
            authType: "NONE",
            credentialKeys: [],
          },
        });
        expect(catalogRepository.findAll).toHaveBeenCalledWith(mockDb);
      });

      test("Manager APIを呼ばない", async () => {
        vi.mocked(catalogRepository.findAll).mockResolvedValue([localCatalog]);

        await catalogService.getAllCatalogs();

        expect(requestManagerApi).not.toHaveBeenCalled();
      });

      test("ローカルカタログが空の場合は空配列を返す", async () => {
        vi.mocked(catalogRepository.findAll).mockResolvedValue([]);

        const result = await catalogService.getAllCatalogs();

        expect(result).toStrictEqual([]);
      });
    });
  });

  describe("addFromCatalog", () => {
    const addInput: AddFromCatalogInput = {
      catalogId: "1",
      serverName: "Filesystem",
      description: "ファイルシステム操作",
      status: "available",
      permissions: { read: true, write: true, execute: true },
      connectionTemplate: {
        transportType: "STDIO",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        url: null,
        authType: "NONE",
        credentialKeys: [],
      },
      tools: [],
      credentials: {},
    };

    const mockResult = { serverId: 1, serverName: "Filesystem" };

    describe("個人利用モード", () => {
      beforeEach(() => {
        vi.mocked(resolveByProfile).mockImplementation(async (handlers) =>
          handlers.personal(),
        );
      });

      test("createFromCatalogに変換して呼び出す", async () => {
        vi.mocked(createFromCatalog).mockResolvedValue(mockResult);

        const result = await catalogService.addFromCatalog(addInput);

        expect(result).toStrictEqual(mockResult);
        expect(createFromCatalog).toHaveBeenCalledWith({
          catalogId: 1,
          catalogName: "Filesystem",
          description: "ファイルシステム操作",
          transportType: "STDIO",
          command: "npx",
          args: '["-y","@modelcontextprotocol/server-filesystem"]',
          url: null,
          credentialKeys: [],
          credentials: {},
          authType: "NONE",
        });
        expect(createFromManagerCatalog).not.toHaveBeenCalled();
      });
    });

    describe("組織利用モード", () => {
      beforeEach(() => {
        vi.mocked(resolveByProfile).mockImplementation(async (handlers) =>
          handlers.organization(),
        );
      });

      test("createFromManagerCatalogに変換して呼び出す", async () => {
        vi.mocked(createFromManagerCatalog).mockResolvedValue(mockResult);

        const result = await catalogService.addFromCatalog(addInput);

        expect(result).toStrictEqual(mockResult);
        expect(createFromManagerCatalog).toHaveBeenCalledWith({
          catalogId: "1",
          serverName: "Filesystem",
          description: "ファイルシステム操作",
          status: "available",
          permissions: { read: true, write: true, execute: true },
          connectionTemplate: addInput.connectionTemplate,
          tools: [],
          credentials: {},
        });
        expect(createFromCatalog).not.toHaveBeenCalled();
      });
    });
  });

  describe("getAllLocalCatalogs", () => {
    test("ローカルカタログを取得する", async () => {
      const mockCatalogs = [{ id: 1, name: "A Catalog" }];
      vi.mocked(catalogRepository.findAll).mockResolvedValue(
        mockCatalogs as Awaited<ReturnType<typeof catalogRepository.findAll>>,
      );

      const result = await catalogService.getAllLocalCatalogs();

      expect(result).toStrictEqual(mockCatalogs);
      expect(catalogRepository.findAll).toHaveBeenCalledWith(mockDb);
    });
  });
});
