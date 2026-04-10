import { describe, test, expect, beforeEach, vi } from "vitest";
import type { CreateFromCatalogInput } from "../mcp.types";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../mcp.repository");
vi.mock("../../../utils/encryption");
vi.mock("../mcp.connection");

// テスト対象のインポート（モックの後に行う）
import * as mcpService from "../mcp.service";
import { getDb } from "../../../shared/db";
import * as mcpRepository from "../mcp.repository";
import * as mcpConnection from "../mcp.connection";
import { encryptToken, decryptToken } from "../../../utils/encryption";

describe("mcp.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    // encryptToken: "encrypted:{入力}" を返す
    vi.mocked(encryptToken).mockImplementation(async (v) => `encrypted:${v}`);
    // decryptToken: "encrypted:" プレフィックスを除去して返す
    vi.mocked(decryptToken).mockImplementation(async (v) =>
      v.replace(/^encrypted:/, ""),
    );
  });

  describe("createFromCatalog", () => {
    const input: CreateFromCatalogInput = {
      catalogId: 1,
      catalogName: "Test MCP",
      description: "テスト用MCP",
      transportType: "STDIO",
      command: "npx",
      args: '["test-server"]',
      url: null,
      credentialKeys: ["API_KEY"],
      credentials: { API_KEY: "test-key" },
      authType: "API_KEY",
    };

    test("カタログからMCPサーバーと接続を作成する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 1, serverName: "Test MCP" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(mockDb, {
        name: "Test MCP",
        slug: "test-mcp",
        description: "テスト用MCP",
      });
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(mockDb, {
        name: "Test MCP",
        slug: "test-mcp",
        transportType: "STDIO",
        command: "npx",
        args: '["test-server"]',
        url: null,
        credentials: `encrypted:${JSON.stringify({ API_KEY: "test-key" })}`,
        authType: "API_KEY",
        serverId: 1,
        catalogId: 1,
      });
    });

    test("サーバー名重複時にサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName)
        .mockResolvedValueOnce({
          id: 99,
        } as Awaited<ReturnType<typeof mcpRepository.findServerByName>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 2,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 2, serverName: "Test MCP 2" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ name: "Test MCP 2", slug: "test-mcp-2" }),
      );
    });

    test("slug重複時にサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug)
        .mockResolvedValueOnce({
          id: 99,
        } as Awaited<ReturnType<typeof mcpRepository.findServerBySlug>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 3,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 3, serverName: "Test MCP" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ slug: "test-mcp-1" }),
      );
    });

    test("リモート+API_KEYサーバーは接続確認してツールを保存する", async () => {
      const remoteInput: CreateFromCatalogInput = {
        catalogId: 10,
        catalogName: "Remote API",
        description: "リモートMCP",
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: "[]",
        url: "https://example.com/mcp",
        credentialKeys: ["X-API-Key"],
        credentials: { "X-API-Key": "my-key" },
        authType: "API_KEY",
      };

      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 5,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 50,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpRepository.createTools).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createTools>>,
      );
      vi.mocked(mcpRepository.updateServerStatus).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.updateServerStatus>>,
      );
      vi.mocked(mcpConnection.listToolsHTTP).mockResolvedValue([
        { name: "tool1", description: "desc", inputSchema: "{}" },
      ]);

      const result = await mcpService.createFromCatalog(remoteInput);

      expect(result).toStrictEqual({ serverId: 5, serverName: "Remote API" });
      expect(mcpConnection.listToolsHTTP).toHaveBeenCalledWith(
        "https://example.com/mcp",
        { "X-API-Key": "my-key" },
      );
      expect(mcpRepository.createTools).toHaveBeenCalledWith(mockDb, [
        {
          name: "tool1",
          description: "desc",
          inputSchema: "{}",
          connectionId: 50,
        },
      ]);
      expect(mcpRepository.updateServerStatus).toHaveBeenCalledWith(
        mockDb,
        5,
        "RUNNING",
      );
    });

    test("リモート+BEARERサーバーはAuthorizationヘッダーを構築する", async () => {
      const bearerInput: CreateFromCatalogInput = {
        catalogId: 11,
        catalogName: "Bearer API",
        description: "Bearer認証MCP",
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: "[]",
        url: "https://example.com/mcp",
        credentialKeys: ["API Key"],
        credentials: { "API Key": "my-token" },
        authType: "BEARER",
      };

      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 6,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 60,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpRepository.createTools).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createTools>>,
      );
      vi.mocked(mcpRepository.updateServerStatus).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.updateServerStatus>>,
      );
      vi.mocked(mcpConnection.listToolsHTTP).mockResolvedValue([
        { name: "tool1", description: "desc", inputSchema: "{}" },
      ]);

      await mcpService.createFromCatalog(bearerInput);

      expect(mcpConnection.listToolsHTTP).toHaveBeenCalledWith(
        "https://example.com/mcp",
        { Authorization: "Bearer my-token" },
      );
    });

    test("SSEサーバーはlistToolsSSEを使用する", async () => {
      const sseInput: CreateFromCatalogInput = {
        catalogId: 12,
        catalogName: "SSE API",
        description: "SSE MCP",
        transportType: "SSE",
        command: null,
        args: "[]",
        url: "https://example.com/sse",
        credentialKeys: ["Authorization"],
        credentials: { Authorization: "key-123" },
        authType: "API_KEY",
      };

      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 7,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 70,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpRepository.createTools).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createTools>>,
      );
      vi.mocked(mcpRepository.updateServerStatus).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.updateServerStatus>>,
      );
      vi.mocked(mcpConnection.listToolsSSE).mockResolvedValue([
        { name: "tool1", description: "desc", inputSchema: "{}" },
      ]);

      await mcpService.createFromCatalog(sseInput);

      expect(mcpConnection.listToolsSSE).toHaveBeenCalledWith(
        "https://example.com/sse",
        { Authorization: "key-123" },
      );
    });

    test("STDIOサーバーは接続確認をスキップする", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createFromCatalog(input);

      expect(mcpConnection.listToolsHTTP).not.toHaveBeenCalled();
      expect(mcpConnection.listToolsSSE).not.toHaveBeenCalled();
      expect(mcpRepository.createTools).not.toHaveBeenCalled();
      expect(mcpRepository.updateServerStatus).not.toHaveBeenCalled();
    });

    test("credentialsを暗号化してJSON文字列で保存する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createFromCatalog(input);

      expect(encryptToken).toHaveBeenCalledWith('{"API_KEY":"test-key"}');
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          credentials: 'encrypted:{"API_KEY":"test-key"}',
        }),
      );
    });
  });

  describe("getAllServers", () => {
    test("全サーバーを取得する", async () => {
      const mockServers = [
        { id: 1, name: "Server A", connections: [] },
        { id: 2, name: "Server B", connections: [] },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );

      const result = await mcpService.getAllServers();

      expect(result).toStrictEqual(mockServers);
      expect(mcpRepository.findAllWithConnections).toHaveBeenCalledWith(mockDb);
    });

    test("暗号化されたcredentialsを復号して返す", async () => {
      const mockServers = [
        {
          id: 1,
          name: "Server A",
          connections: [
            { id: 1, credentials: "safe:encrypted-data" },
            { id: 2, credentials: "fallback:encrypted-data" },
          ],
        },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );
      vi.mocked(decryptToken).mockResolvedValue('{"API_KEY":"decrypted"}');

      const result = await mcpService.getAllServers();

      expect(decryptToken).toHaveBeenCalledTimes(2);
      expect(result[0]?.connections[0]?.credentials).toBe(
        '{"API_KEY":"decrypted"}',
      );
      expect(result[0]?.connections[1]?.credentials).toBe(
        '{"API_KEY":"decrypted"}',
      );
    });

    test("平文の既存credentialsはそのまま返す（マイグレーション互換）", async () => {
      const plainCredentials = '{"API_KEY":"plain-text-key"}';
      const mockServers = [
        {
          id: 1,
          name: "Server A",
          connections: [{ id: 1, credentials: plainCredentials }],
        },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );

      const result = await mcpService.getAllServers();

      expect(decryptToken).not.toHaveBeenCalled();
      expect(result[0]?.connections[0]?.credentials).toBe(plainCredentials);
    });
  });
});
