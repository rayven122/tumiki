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
  serverType: "OFFICIAL",
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
      expect(result.serverType).toBe("OFFICIAL");
    });

    test("同一slugのサーバーは作成できない", async () => {
      await mcpRepository.createServer(db, serverData);

      await expect(
        mcpRepository.createServer(db, serverData),
      ).rejects.toThrow();
    });

    test("serverType に CUSTOM を渡すと CUSTOM で永続化される（仮想MCP作成経路）", async () => {
      const result = await mcpRepository.createServer(db, {
        ...serverData,
        slug: "virtual-server",
        serverType: "CUSTOM",
      });

      expect(result.serverType).toBe("CUSTOM");
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

  describe("findConnectionsByIdsWithTools", () => {
    test("複数IDで接続をtoolsと共に一括取得する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      const conn1 = await mcpRepository.createConnection(db, {
        ...buildConnectionData(server.id),
        slug: "c1",
      });
      const conn2 = await mcpRepository.createConnection(db, {
        ...buildConnectionData(server.id),
        slug: "c2",
      });
      await mcpRepository.createTools(db, [
        {
          name: "tool-a",
          description: "desc-a",
          inputSchema: "{}",
          connectionId: conn1.id,
          isAllowed: true,
        },
        {
          name: "tool-b",
          description: "desc-b",
          inputSchema: "{}",
          connectionId: conn1.id,
          isAllowed: false,
        },
        {
          name: "tool-c",
          description: "desc-c",
          inputSchema: "{}",
          connectionId: conn2.id,
          isAllowed: true,
        },
      ]);

      const result = await mcpRepository.findConnectionsByIdsWithTools(db, [
        conn1.id,
        conn2.id,
      ]);

      expect(result).toHaveLength(2);
      const byId = new Map(result.map((c) => [c.id, c]));
      expect(byId.get(conn1.id)!.tools).toHaveLength(2);
      expect(byId.get(conn1.id)!.tools[0]!.name).toBe("tool-a");
      expect(byId.get(conn1.id)!.tools[0]!.isAllowed).toBe(true);
      expect(byId.get(conn1.id)!.tools[1]!.name).toBe("tool-b");
      expect(byId.get(conn1.id)!.tools[1]!.isAllowed).toBe(false);
      expect(byId.get(conn2.id)!.tools).toHaveLength(1);
    });

    test("空配列の場合は空配列を返す（DB問い合わせをスキップ）", async () => {
      const result = await mcpRepository.findConnectionsByIdsWithTools(db, []);
      expect(result).toStrictEqual([]);
    });

    test("存在しないIDは結果から除外される", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      const connection = await mcpRepository.createConnection(
        db,
        buildConnectionData(server.id),
      );

      const result = await mcpRepository.findConnectionsByIdsWithTools(db, [
        connection.id,
        99999,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(connection.id);
    });

    test("server.serverType が取得される（仮想MCP再ネスト判定で参照されるため）", async () => {
      const server = await mcpRepository.createServer(db, {
        ...serverData,
        slug: "virtual-server",
        serverType: "CUSTOM",
      });
      const connection = await mcpRepository.createConnection(
        db,
        buildConnectionData(server.id),
      );

      const result = await mcpRepository.findConnectionsByIdsWithTools(db, [
        connection.id,
      ]);

      expect(result[0]!.server.serverType).toBe("CUSTOM");
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

  describe("updateIsPiiMaskingEnabled", () => {
    test("PIIマスキングを無効化する（デフォルト true から false へ）", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.updateIsPiiMaskingEnabled(
        db,
        server.id,
        false,
      );

      expect(result.isPiiMaskingEnabled).toBe(false);
    });

    test("PIIマスキングを再度有効化する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.updateIsPiiMaskingEnabled(db, server.id, false);

      const result = await mcpRepository.updateIsPiiMaskingEnabled(
        db,
        server.id,
        true,
      );

      expect(result.isPiiMaskingEnabled).toBe(true);
    });

    test("isEnabled など他のフィールドは変更しない", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.toggleServerEnabled(db, server.id, false);

      const result = await mcpRepository.updateIsPiiMaskingEnabled(
        db,
        server.id,
        false,
      );

      expect(result.isEnabled).toBe(false);
      expect(result.isPiiMaskingEnabled).toBe(false);
    });

    test("存在しないIDの場合はエラーになる", async () => {
      await expect(
        mcpRepository.updateIsPiiMaskingEnabled(db, 99999, false),
      ).rejects.toThrow();
    });
  });

  describe("updateIsToonConversionEnabled", () => {
    test("TOON変換を有効化する（デフォルト false から true へ）", async () => {
      const server = await mcpRepository.createServer(db, serverData);

      const result = await mcpRepository.updateIsToonConversionEnabled(
        db,
        server.id,
        true,
      );

      expect(result.isToonConversionEnabled).toBe(true);
    });

    test("TOON変換を再度無効化する", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.updateIsToonConversionEnabled(db, server.id, true);

      const result = await mcpRepository.updateIsToonConversionEnabled(
        db,
        server.id,
        false,
      );

      expect(result.isToonConversionEnabled).toBe(false);
    });

    test("isPiiMaskingEnabled など他のフィールドは変更しない", async () => {
      const server = await mcpRepository.createServer(db, serverData);
      await mcpRepository.updateIsPiiMaskingEnabled(db, server.id, false);

      const result = await mcpRepository.updateIsToonConversionEnabled(
        db,
        server.id,
        true,
      );

      expect(result.isPiiMaskingEnabled).toBe(false);
      expect(result.isToonConversionEnabled).toBe(true);
    });

    test("存在しないIDの場合はエラーになる", async () => {
      await expect(
        mcpRepository.updateIsToonConversionEnabled(db, 99999, false),
      ).rejects.toThrow();
    });
  });
});
