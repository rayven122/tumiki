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

// テスト対象のインポート（モックの後に行う）
import * as mcpService from "../mcp.service";
import { getDb } from "../../../shared/db";
import * as mcpRepository from "../mcp.repository";

describe("mcp.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
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
        credentials: JSON.stringify({ API_KEY: "test-key" }),
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

    test("credentialsをJSON文字列に変換する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createFromCatalog(input);

      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          credentials: '{"API_KEY":"test-key"}',
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
  });
});
