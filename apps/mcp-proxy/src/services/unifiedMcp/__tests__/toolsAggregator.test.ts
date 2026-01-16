/**
 * ツール集約サービスのテスト
 */

/* eslint-disable @typescript-eslint/unbound-method */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { ServerStatus } from "@tumiki/db/server";

// DBをモック
vi.mock("@tumiki/db/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...mod,
    db: {
      unifiedMcpServer: {
        findUnique: vi.fn(),
      },
    },
  };
});

// キャッシュをモック
vi.mock("../../../libs/cache/unifiedToolsCache.js", () => ({
  getUnifiedToolsFromCache: vi.fn(),
  setUnifiedToolsCache: vi.fn(),
}));

// loggerをモック
vi.mock("../../../libs/logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { db } from "@tumiki/db/server";
import {
  getUnifiedToolsFromCache,
  setUnifiedToolsCache,
} from "../../../libs/cache/unifiedToolsCache.js";
import { aggregateTools, getChildServers } from "../toolsAggregator.js";

describe("aggregateTools", () => {
  const unifiedMcpServerId = "unified-server-123";

  const mockTool1 = {
    name: "tool1",
    description: "Tool 1 description",
    inputSchema: { type: "object" },
  };

  const mockTool2 = {
    name: "tool2",
    description: "Tool 2 description",
    inputSchema: { type: "object", properties: { name: { type: "string" } } },
  };

  const mockInstance1 = {
    id: "instance-1",
    normalizedName: "instance_a",
    allowedTools: [mockTool1],
  };

  const mockInstance2 = {
    id: "instance-2",
    normalizedName: "instance_b",
    allowedTools: [mockTool2],
  };

  const mockChildServer1 = {
    id: "server-1",
    name: "Server 1",
    serverStatus: ServerStatus.RUNNING,
    deletedAt: null,
    templateInstances: [mockInstance1],
  };

  const mockChildServer2 = {
    id: "server-2",
    name: "Server 2",
    serverStatus: ServerStatus.RUNNING,
    deletedAt: null,
    templateInstances: [mockInstance2],
  };

  const mockUnifiedServer = {
    id: unifiedMcpServerId,
    name: "Unified Server",
    childServers: [
      { displayOrder: 0, mcpServer: mockChildServer1 },
      { displayOrder: 1, mcpServer: mockChildServer2 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("キャッシュがある場合はキャッシュを返す", async () => {
    const cachedTools = [
      {
        name: "server-1__instance_a__tool1",
        description: "Tool 1 description",
        inputSchema: { type: "object" },
        mcpServerId: "server-1",
        instanceName: "instance_a",
      },
    ];

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(cachedTools);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toStrictEqual(cachedTools);
    expect(getUnifiedToolsFromCache).toHaveBeenCalledWith(unifiedMcpServerId);
    expect(db.unifiedMcpServer.findUnique).not.toHaveBeenCalled();
  });

  test("キャッシュがない場合はDBから取得してキャッシュに保存する", async () => {
    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toHaveLength(2);
    expect(result[0]).toStrictEqual({
      name: "server-1__instance_a__tool1",
      description: "Tool 1 description",
      inputSchema: { type: "object" },
      mcpServerId: "server-1",
      instanceName: "instance_a",
    });
    expect(result[1]).toStrictEqual({
      name: "server-2__instance_b__tool2",
      description: "Tool 2 description",
      inputSchema: { type: "object", properties: { name: { type: "string" } } },
      mcpServerId: "server-2",
      instanceName: "instance_b",
    });

    expect(setUnifiedToolsCache).toHaveBeenCalledWith(
      unifiedMcpServerId,
      result,
    );
  });

  test("統合MCPサーバーが見つからない場合はエラーをスローする", async () => {
    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(null);

    await expect(aggregateTools(unifiedMcpServerId)).rejects.toThrow(
      `Unified MCP server not found: ${unifiedMcpServerId}`,
    );
  });

  test("子サーバーがSTOPPEDの場合はエラーをスローする（Fail-fast）", async () => {
    const stoppedServer = {
      ...mockChildServer1,
      serverStatus: ServerStatus.STOPPED,
    };

    const unifiedServerWithStopped = {
      ...mockUnifiedServer,
      childServers: [{ displayOrder: 0, mcpServer: stoppedServer }],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithStopped as never,
    );

    await expect(aggregateTools(unifiedMcpServerId)).rejects.toThrow(
      "Cannot aggregate tools: some child servers are not running: Server 1 (STOPPED)",
    );
  });

  test("子サーバーがERRORの場合はエラーをスローする（Fail-fast）", async () => {
    const errorServer = {
      ...mockChildServer1,
      serverStatus: ServerStatus.ERROR,
    };

    const unifiedServerWithError = {
      ...mockUnifiedServer,
      childServers: [{ displayOrder: 0, mcpServer: errorServer }],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithError as never,
    );

    await expect(aggregateTools(unifiedMcpServerId)).rejects.toThrow(
      "Cannot aggregate tools: some child servers are not running: Server 1 (ERROR)",
    );
  });

  test("複数の子サーバーがSTOPPED/ERRORの場合は全て報告する", async () => {
    const stoppedServer = {
      ...mockChildServer1,
      serverStatus: ServerStatus.STOPPED,
    };

    const errorServer = {
      ...mockChildServer2,
      serverStatus: ServerStatus.ERROR,
    };

    const unifiedServerWithProblems = {
      ...mockUnifiedServer,
      childServers: [
        { displayOrder: 0, mcpServer: stoppedServer },
        { displayOrder: 1, mcpServer: errorServer },
      ],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithProblems as never,
    );

    await expect(aggregateTools(unifiedMcpServerId)).rejects.toThrow(
      "Cannot aggregate tools: some child servers are not running: Server 1 (STOPPED), Server 2 (ERROR)",
    );
  });

  test("論理削除された子サーバーは除外される", async () => {
    const deletedServer = {
      ...mockChildServer2,
      deletedAt: new Date("2024-01-01"),
    };

    const unifiedServerWithDeleted = {
      ...mockUnifiedServer,
      childServers: [
        { displayOrder: 0, mcpServer: mockChildServer1 },
        { displayOrder: 1, mcpServer: deletedServer },
      ],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithDeleted as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    // server-2 は削除されているので、server-1 のツールのみ返される
    expect(result).toHaveLength(1);
    expect(result[0]?.mcpServerId).toBe("server-1");
  });

  test("全ての子サーバーが論理削除された場合は空配列を返す", async () => {
    const deletedServer1 = {
      ...mockChildServer1,
      deletedAt: new Date("2024-01-01"),
    };

    const deletedServer2 = {
      ...mockChildServer2,
      deletedAt: new Date("2024-01-02"),
    };

    const unifiedServerWithAllDeleted = {
      ...mockUnifiedServer,
      childServers: [
        { displayOrder: 0, mcpServer: deletedServer1 },
        { displayOrder: 1, mcpServer: deletedServer2 },
      ],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithAllDeleted as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toStrictEqual([]);
    expect(setUnifiedToolsCache).toHaveBeenCalledWith(unifiedMcpServerId, []);
  });

  test("複数インスタンスを持つサーバーの全ツールを集約する", async () => {
    const serverWithMultipleInstances = {
      ...mockChildServer1,
      templateInstances: [mockInstance1, mockInstance2],
    };

    const unifiedServerWithMultipleInstances = {
      ...mockUnifiedServer,
      childServers: [
        { displayOrder: 0, mcpServer: serverWithMultipleInstances },
      ],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithMultipleInstances as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("server-1__instance_a__tool1");
    expect(result[1]?.name).toBe("server-1__instance_b__tool2");
  });
});

describe("getChildServers", () => {
  const unifiedMcpServerId = "unified-server-456";

  const mockChildServer1 = {
    id: "server-1",
    name: "Server 1",
    serverStatus: ServerStatus.RUNNING,
    deletedAt: null,
  };

  const mockChildServer2 = {
    id: "server-2",
    name: "Server 2",
    serverStatus: ServerStatus.STOPPED,
    deletedAt: null,
  };

  const mockUnifiedServer = {
    id: unifiedMcpServerId,
    name: "Unified Server",
    childServers: [
      { displayOrder: 0, mcpServer: mockChildServer1 },
      { displayOrder: 1, mcpServer: mockChildServer2 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("子サーバー一覧を取得できる", async () => {
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );

    const result = await getChildServers(unifiedMcpServerId);

    expect(result).toHaveLength(2);
    expect(result).toStrictEqual([
      { id: "server-1", name: "Server 1", serverStatus: ServerStatus.RUNNING },
      { id: "server-2", name: "Server 2", serverStatus: ServerStatus.STOPPED },
    ]);
  });

  test("統合MCPサーバーが見つからない場合はエラーをスローする", async () => {
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(null);

    await expect(getChildServers(unifiedMcpServerId)).rejects.toThrow(
      `Unified MCP server not found: ${unifiedMcpServerId}`,
    );
  });

  test("論理削除された子サーバーは除外される", async () => {
    const deletedServer = {
      ...mockChildServer2,
      deletedAt: new Date("2024-01-01"),
    };

    const unifiedServerWithDeleted = {
      ...mockUnifiedServer,
      childServers: [
        { displayOrder: 0, mcpServer: mockChildServer1 },
        { displayOrder: 1, mcpServer: deletedServer },
      ],
    };

    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      unifiedServerWithDeleted as never,
    );

    const result = await getChildServers(unifiedMcpServerId);

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual({
      id: "server-1",
      name: "Server 1",
      serverStatus: ServerStatus.RUNNING,
    });
  });
});
