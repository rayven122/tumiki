import { describe, test, expect, vi, beforeEach } from "vitest";
import type { CloudMcpServer } from "../mcp-policy-sync.types";

const mockTx = vi.hoisted(() => ({
  mcpConnection: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  mcpTool: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

const mockDb = vi.hoisted(() => ({
  $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx),
  ),
}));

const mockGetDb = vi.hoisted(() => vi.fn());

vi.mock("electron", () => ({
  app: { getPath: vi.fn().mockReturnValue("/tmp") },
}));

vi.mock("../../../shared/utils/logger");

vi.mock("../../../shared/db", () => ({
  getDb: mockGetDb,
}));

const mockFindServerBySlug = vi.hoisted(() => vi.fn());
const mockCreateServer = vi.hoisted(() => vi.fn());
const mockCreateSecret = vi.hoisted(() => vi.fn());
const mockCreateConnection = vi.hoisted(() => vi.fn());
const mockCreateTools = vi.hoisted(() => vi.fn());
const mockUpdateServer = vi.hoisted(() => vi.fn());

vi.mock("../../mcp-server-list/mcp.repository", () => ({
  findServerBySlug: mockFindServerBySlug,
  createServer: mockCreateServer,
  createSecret: mockCreateSecret,
  createConnection: mockCreateConnection,
  createTools: mockCreateTools,
  updateServer: mockUpdateServer,
}));

vi.mock("../../../utils/encryption", () => ({
  encryptToken: vi.fn().mockResolvedValue("encrypted-credentials"),
}));

vi.mock("../../../../shared/mcp.slug", () => ({
  toSlug: vi.fn((s: string) => s),
  generateRandomSuffix: vi.fn().mockReturnValue("rand123"),
}));

const mockRequestManagerApi = vi.hoisted(() => vi.fn());
vi.mock("../../../shared/manager-api-client", () => ({
  requestManagerApi: mockRequestManagerApi,
}));

import { syncMcpPolicies } from "../mcp-policy-sync.service";

const makeTool = (name = "tool-1") => ({
  id: `tool-id-${name}`,
  name,
  description: `Description for ${name}`,
  inputSchema: { type: "object", properties: {} },
});

const makeInstance = (
  overrides: Partial<CloudMcpServer["templateInstances"][number]> = {},
) => ({
  id: "inst-1",
  normalizedName: "my-server",
  isEnabled: true,
  transportType: "STDIO" as const,
  command: "/usr/bin/node",
  args: ["server.js"],
  url: null,
  authType: "API_KEY" as const,
  tools: [makeTool()],
  ...overrides,
});

const makeServer = (
  overrides: Partial<CloudMcpServer> = {},
): CloudMcpServer => ({
  id: "server-id-1",
  slug: "my-mcp-server",
  name: "My MCP Server",
  description: "A test MCP server",
  iconPath: null,
  permissions: { read: true, write: false, execute: true },
  templateInstances: [makeInstance()],
  ...overrides,
});

const makeApiResponse = (servers: CloudMcpServer[]) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ mcpServers: servers }),
});

describe("syncMcpPolicies", () => {
  beforeEach(() => {
    mockGetDb.mockResolvedValue(mockDb);
    mockFindServerBySlug.mockResolvedValue(null);
    mockCreateServer.mockResolvedValue({ id: 100 });
    mockCreateSecret.mockResolvedValue({ id: 200 });
    mockCreateConnection.mockResolvedValue({ id: 300 });
    mockCreateTools.mockResolvedValue(undefined);
    mockUpdateServer.mockResolvedValue(undefined);
    mockTx.mcpConnection.findMany.mockResolvedValue([
      { id: 300, secretId: 200 },
    ]);
    mockTx.mcpConnection.update.mockResolvedValue(undefined);
    mockTx.mcpTool.deleteMany.mockResolvedValue(undefined);
    mockTx.mcpTool.createMany.mockResolvedValue(undefined);
  });

  describe("正常系", () => {
    test("新規サーバーを作成してcreated件数を返す", async () => {
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([makeServer()]));

      const result = await syncMcpPolicies();

      expect(result).toStrictEqual({ created: 1, updated: 0, failed: 0 });
      expect(mockCreateServer).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          name: "My MCP Server",
          slug: "my-mcp-server",
        }),
      );
    });

    test("既存サーバーを更新してupdated件数を返す", async () => {
      mockFindServerBySlug.mockResolvedValue({ id: 99 });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([makeServer()]));

      const result = await syncMcpPolicies();

      expect(result).toStrictEqual({ created: 0, updated: 1, failed: 0 });
      expect(mockUpdateServer).toHaveBeenCalledWith(
        mockTx,
        99,
        expect.objectContaining({ name: "My MCP Server" }),
      );
    });

    test("複数サーバーの混在（新規+更新）を正しく処理する", async () => {
      const newServer = makeServer({ slug: "new-server", name: "New Server" });
      const existingServer = makeServer({
        slug: "existing-server",
        name: "Existing Server",
      });

      mockFindServerBySlug
        .mockResolvedValueOnce(null) // new-server: ループ内の存在確認
        .mockResolvedValueOnce(null) // new-server: createCloudMcpServer 内のslug重複チェック
        .mockResolvedValueOnce({ id: 50 }); // existing-server: ループ内の存在確認
      mockRequestManagerApi.mockResolvedValue(
        makeApiResponse([newServer, existingServer]),
      );

      const result = await syncMcpPolicies();

      expect(result).toStrictEqual({ created: 1, updated: 1, failed: 0 });
    });

    test("STREAMABLE_HTTPSはSTREAMABLE_HTTPにマッピングされる", async () => {
      const server = makeServer({
        templateInstances: [
          makeInstance({
            transportType: "STREAMABLE_HTTPS",
            url: "https://api.example.com/mcp",
            command: null,
          }),
        ],
      });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([server]));

      await syncMcpPolicies();

      expect(mockCreateConnection).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ transportType: "STREAMABLE_HTTP" }),
      );
    });

    test("ツールがある場合はcreateToolsを呼ぶ", async () => {
      const server = makeServer({
        templateInstances: [
          makeInstance({ tools: [makeTool("tool-a"), makeTool("tool-b")] }),
        ],
      });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([server]));

      await syncMcpPolicies();

      expect(mockCreateTools).toHaveBeenCalledWith(
        mockTx,
        expect.arrayContaining([
          expect.objectContaining({ name: "tool-a" }),
          expect.objectContaining({ name: "tool-b" }),
        ]),
      );
    });

    test("ツールがない場合はcreateToolsを呼ばない", async () => {
      const server = makeServer({
        templateInstances: [makeInstance({ tools: [] })],
      });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([server]));

      await syncMcpPolicies();

      expect(mockCreateTools).not.toHaveBeenCalled();
    });

    test("サーバーリストが空の場合は何もしない", async () => {
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([]));

      const result = await syncMcpPolicies();

      expect(result).toStrictEqual({ created: 0, updated: 0, failed: 0 });
      expect(mockCreateServer).not.toHaveBeenCalled();
    });

    test("slug衝突時はサフィックス付きslugで作成する", async () => {
      mockFindServerBySlug
        .mockResolvedValueOnce(null) // ループ内: my-mcp-server は新規
        .mockResolvedValueOnce({ id: 99 }) // slug重複チェック: my-mcp-server が既に使われている
        .mockResolvedValueOnce(null); // slug重複チェック: my-mcp-server-1 は空き

      mockRequestManagerApi.mockResolvedValue(makeApiResponse([makeServer()]));

      await syncMcpPolicies();

      expect(mockCreateServer).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ slug: "my-mcp-server-1" }),
      );
    });
  });

  describe("更新時の認証情報保護", () => {
    test("updateでsecretは変更されない（secretIdをupdateに含めない）", async () => {
      mockFindServerBySlug.mockResolvedValue({ id: 99 });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([makeServer()]));

      await syncMcpPolicies();

      const updateCall = mockTx.mcpConnection.update.mock.calls[0]!;
      expect(updateCall[0].data).not.toHaveProperty("secretId");
      expect(updateCall[0].data).not.toHaveProperty("secret");
    });

    test("updateでツールは全削除→再作成で同期される", async () => {
      mockFindServerBySlug.mockResolvedValue({ id: 99 });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([makeServer()]));

      await syncMcpPolicies();

      expect(mockTx.mcpTool.deleteMany).toHaveBeenCalledWith({
        where: { connectionId: 300 },
      });
      expect(mockTx.mcpTool.createMany).toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    test("APIが応答しない場合はエラーをスロー", async () => {
      mockRequestManagerApi.mockResolvedValue(null);

      await expect(syncMcpPolicies()).rejects.toThrow(
        "管理サーバーへの接続に失敗しました",
      );
    });

    test("APIが401を返す場合はエラーをスロー", async () => {
      mockRequestManagerApi.mockResolvedValue({ ok: false, status: 401 });

      await expect(syncMcpPolicies()).rejects.toThrow(
        "管理サーバーへの再ログインが必要です",
      );
    });

    test("APIがその他エラーを返す場合はエラーをスロー", async () => {
      mockRequestManagerApi.mockResolvedValue({ ok: false, status: 500 });

      await expect(syncMcpPolicies()).rejects.toThrow(
        "MCP設定の取得に失敗しました（500）",
      );
    });

    test("APIレスポンスが不正なフォーマットの場合はエラーをスロー", async () => {
      mockRequestManagerApi.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: "data" }),
      });

      await expect(syncMcpPolicies()).rejects.toThrow(
        "管理サーバーからの応答フォーマットが不正です",
      );
    });

    test("templateInstancesが空のサーバーはfailedにカウントされてスキップされる", async () => {
      const server = makeServer({ templateInstances: [] });
      mockRequestManagerApi.mockResolvedValue(makeApiResponse([server]));

      const result = await syncMcpPolicies();

      expect(mockCreateServer).not.toHaveBeenCalled();
      expect(result).toStrictEqual({ created: 0, updated: 0, failed: 1 });
    });

    test("並行実行時は2回目の呼び出しがエラーになる", async () => {
      mockRequestManagerApi.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(makeApiResponse([])), 50),
          ),
      );

      const first = syncMcpPolicies();
      await expect(syncMcpPolicies()).rejects.toThrow(
        "MCPポリシー同期が既に実行中です",
      );
      await first;
    });
  });
});
