import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from "vitest";
import type { PrismaClient } from "@prisma/desktop-client";
import * as mcpRepository from "../mcp.repository";
import { join } from "path";
import {
  createTestDb,
  cleanupTestDb,
} from "../../../shared/test-helpers/test-db";

const TEST_DB_PATH = join(__dirname, "test-mcp.db");

let db: PrismaClient;

beforeAll(async () => {
  db = await createTestDb(TEST_DB_PATH);
});

beforeEach(async () => {
  await db.mcpConnection.deleteMany();
  await db.mcpServer.deleteMany();
});

afterAll(async () => {
  await cleanupTestDb(db, TEST_DB_PATH);
});

const serverData: mcpRepository.CreateMcpServerInput = {
  name: "Test Server",
  slug: "test-server",
  description: "テスト用サーバー",
};

const buildConnectionData = (
  serverId: number,
): mcpRepository.CreateMcpConnectionInput => ({
  name: "Test Connection",
  slug: "test-connection",
  transportType: "STDIO",
  command: "npx",
  args: '["test-server"]',
  url: null,
  credentials: "{}",
  authType: "NONE",
  serverId,
  catalogId: null,
});

describe("mcp.repository（実DB）", () => {
  describe("createServer", () => {
    test("MCPサーバーを作成する", async () => {
      const result = await mcpRepository.createServer(db, serverData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Server");
      expect(result.slug).toBe("test-server");
      expect(result.description).toBe("テスト用サーバー");
    });

    test("同一slugのサーバーは作成できない", async () => {
      await mcpRepository.createServer(db, serverData);

      await expect(
        mcpRepository.createServer(db, serverData),
      ).rejects.toThrow();
    });
  });

  describe("createConnection", () => {
    test("MCP接続を作成する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      const connectionData = buildConnectionData(server.id);

      const result = await mcpRepository.createConnection(db, connectionData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Connection");
      expect(result.transportType).toBe("STDIO");
      expect(result.command).toBe("npx");
      expect(result.serverId).toBe(server.id);
    });

    test("SSEトランスポートの接続を作成する", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.createConnection(db, {
        ...buildConnectionData(server.id),
        transportType: "SSE",
        command: null,
        url: "http://localhost:3000/sse",
      });

      expect(result.transportType).toBe("SSE");
      expect(result.command).toBeNull();
      expect(result.url).toBe("http://localhost:3000/sse");
    });
  });

  describe("findAllWithConnections", () => {
    test("サーバーが存在しない場合は空配列を返す", async () => {
      const result = await mcpRepository.findAllWithConnections(db);
      expect(result).toStrictEqual([]);
    });

    test("接続情報付きで全サーバーを取得する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.createConnection(db, buildConnectionData(server.id));

      const result = await mcpRepository.findAllWithConnections(db);

      expect(result).toHaveLength(1);
      expect(result[0]!.connections).toHaveLength(1);
      expect(result[0]!.connections[0]!.name).toBe("Test Connection");
    });

    test("各接続に _count.tools が付与される（一覧画面のサマリ用）", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      const connection = await mcpRepository.createConnection(
        db,
        buildConnectionData(server.id),
      );
      await mcpRepository.createTools(db, [
        {
          name: "tool-a",
          description: "",
          inputSchema: "{}",
          connectionId: connection.id,
        },
        {
          name: "tool-b",
          description: "",
          inputSchema: "{}",
          connectionId: connection.id,
        },
      ]);

      const result = await mcpRepository.findAllWithConnections(db);

      expect(result[0]!.connections[0]!._count.tools).toBe(2);
    });

    test("作成日時の降順で取得する", async () => {
      await mcpRepository.createServer(db, {
        ...serverData,
        name: "Server A",
        slug: "server-a",
      });
      // SQLiteのcreatedAtは秒精度のため、同一秒に作成すると順序が不定になる
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await mcpRepository.createServer(db, {
        ...serverData,
        name: "Server B",
        slug: "server-b",
      });

      const result = await mcpRepository.findAllWithConnections(db);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("Server B");
      expect(result[1]!.name).toBe("Server A");
    });
  });

  describe("findServerBySlug", () => {
    test("slugでサーバーを取得する", async () => {
      await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.findServerBySlug(db, "test-server");

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Test Server");
    });

    test("存在しないslugの場合はnullを返す", async () => {
      const result = await mcpRepository.findServerBySlug(
        db,
        "non-existent-slug",
      );
      expect(result).toBeNull();
    });
  });

  describe("findServerByName", () => {
    test("名前でサーバーを取得する", async () => {
      await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.findServerByName(db, "Test Server");

      expect(result).not.toBeNull();
      expect(result!.slug).toBe("test-server");
    });

    test("存在しない名前の場合はnullを返す", async () => {
      const result = await mcpRepository.findServerByName(
        db,
        "non-existent-name",
      );
      expect(result).toBeNull();
    });
  });

  describe("findEnabledConnections", () => {
    test("有効なサーバーの有効な接続のみ取得する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.createConnection(db, buildConnectionData(server.id));

      const result = await mcpRepository.findEnabledConnections(db);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("Test Connection");
      expect(result[0]!.server.name).toBe("Test Server");
    });

    test("無効なサーバーの接続は除外する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.createConnection(db, buildConnectionData(server.id));
      // サーバーを無効化
      await mcpRepository.toggleServerEnabled(db, server.id, false);

      const result = await mcpRepository.findEnabledConnections(db);

      expect(result).toStrictEqual([]);
    });

    test("無効な接続は除外する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await db.mcpConnection.create({
        data: {
          ...buildConnectionData(server.id),
          isEnabled: false,
        },
      });

      const result = await mcpRepository.findEnabledConnections(db);

      expect(result).toStrictEqual([]);
    });

    test("接続が存在しない場合は空配列を返す", async () => {
      const result = await mcpRepository.findEnabledConnections(db);
      expect(result).toStrictEqual([]);
    });
  });

  describe("findServerById", () => {
    test("IDでサーバーを取得する", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.findServerById(db, server.id);

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Test Server");
    });

    test("存在しないIDの場合はnullを返す", async () => {
      const result = await mcpRepository.findServerById(db, 99999);
      expect(result).toBeNull();
    });
  });

  describe("updateServer", () => {
    test("サーバー名を更新する", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.updateServer(db, server.id, {
        name: "Updated Server",
      });

      expect(result.name).toBe("Updated Server");
      expect(result.description).toBe("テスト用サーバー");
    });

    test("サーバー説明を更新する", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.updateServer(db, server.id, {
        description: "更新された説明",
      });

      expect(result.name).toBe("Test Server");
      expect(result.description).toBe("更新された説明");
    });

    test("存在しないIDの場合はエラーになる", async () => {
      await expect(
        mcpRepository.updateServer(db, 99999, { name: "X" }),
      ).rejects.toThrow();
    });
  });

  describe("deleteServer", () => {
    test("サーバーを削除する", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      await mcpRepository.deleteServer(db, server.id);

      const result = await mcpRepository.findServerById(db, server.id);
      expect(result).toBeNull();
    });

    test("カスケードで接続も削除される", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.createConnection(db, buildConnectionData(server.id));

      await mcpRepository.deleteServer(db, server.id);

      const connections = await db.mcpConnection.findMany({
        where: { serverId: server.id },
      });
      expect(connections).toStrictEqual([]);
    });

    test("存在しないIDの場合はエラーになる", async () => {
      await expect(mcpRepository.deleteServer(db, 99999)).rejects.toThrow();
    });
  });

  describe("toggleServerEnabled", () => {
    test("サーバーを無効化する", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.toggleServerEnabled(
        db,
        server.id,
        false,
      );

      expect(result.isEnabled).toBe(false);
    });

    test("サーバーを有効化する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.toggleServerEnabled(db, server.id, false);

      const result = await mcpRepository.toggleServerEnabled(
        db,
        server.id,
        true,
      );

      expect(result.isEnabled).toBe(true);
    });

    test("存在しないIDの場合はエラーになる", async () => {
      await expect(
        mcpRepository.toggleServerEnabled(db, 99999, false),
      ).rejects.toThrow();
    });
  });
});
