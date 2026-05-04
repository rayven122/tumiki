import { describe, test, expect, beforeEach, vi } from "vitest";

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

// テスト対象のインポート（モックの後に行う）
import * as catalogService from "../catalog.service";
import { getDb } from "../../../shared/db";
import * as catalogRepository from "../catalog.repository";
import { requestManagerApi } from "../../../shared/manager-api-client";

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

    test("Manager未接続時はSQLite fallbackせずエラーにする", async () => {
      vi.mocked(requestManagerApi).mockResolvedValueOnce(null);

      await expect(catalogService.getAllCatalogs()).rejects.toThrow(
        "管理サーバーに接続またはログインされていません",
      );
      expect(catalogRepository.findAll).not.toHaveBeenCalled();
    });

    test("Manager APIエラー時はSQLite fallbackせずエラーにする", async () => {
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
