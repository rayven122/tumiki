import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  createMCPConnection,
  healthCheck,
  markAsActive,
  markAsInactive,
  closeConnection,
  createConnection,
} from "../connectionUtils.js";
import type { MCPConnection, MCPConnectionOptions } from "../types.js";
import type { ServerConfig } from "../../../libs/types.js";

vi.mock("../../../libs/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockTransportInstance = {
  close: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue(undefined),
  onMessage: vi.fn(),
  onClose: vi.fn(),
  onError: vi.fn(),
};

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => mockTransportInstance),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => mockTransportInstance),
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockResolvedValue({ tools: [] }),
    close: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@tumiki/utils/server/security", () => ({
  setupGoogleCredentialsEnv: vi.fn().mockResolvedValue({
    envVars: {},
    cleanup: vi.fn(),
  }),
}));

describe("createMCPConnection", () => {
  let mockClient: Client;
  let mockTransport: Transport;
  let options: MCPConnectionOptions;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    mockTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
      onMessage: vi.fn(),
      onClose: vi.fn(),
      onError: vi.fn(),
    } as unknown as Transport;

    options = {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: {
        name: "test-server",
        toolNames: ["test-tool"],
        transport: {
          type: "stdio",
          command: "test-command",
          args: ["test-arg"],
        },
      } as ServerConfig,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("正しく接続が作成される", () => {
    const connection = createMCPConnection(mockClient, mockTransport, options);

    expect(connection.serverName).toBe("test-server");
    expect(connection.userServerConfigInstanceId).toBe("test-instance-id");
    expect(connection.isActive).toBe(false);
    expect(connection.lastUsed).toBeGreaterThan(0);
    expect(connection.client).toBe(mockClient);
    expect(connection.transport).toBe(mockTransport);
  });

  test("クリーンアップ関数を含む接続が作成される", () => {
    const mockCleanup = vi.fn().mockResolvedValue(undefined);
    const connection = createMCPConnection(
      mockClient,
      mockTransport,
      options,
      mockCleanup,
    );

    expect(connection.credentialsCleanup).toBe(mockCleanup);
  });
});

describe("markAsActive", () => {
  let connection: MCPConnection;

  beforeEach(() => {
    connection = createMCPConnection({} as Client, {} as Transport, {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: {} as ServerConfig,
    });
  });

  test("接続をアクティブ状態にマークできる", () => {
    const initialTime = connection.lastUsed;

    markAsActive(connection);

    expect(connection.isActive).toBe(true);
    expect(connection.lastUsed).toBeGreaterThanOrEqual(initialTime);
  });
});

describe("markAsInactive", () => {
  let connection: MCPConnection;

  beforeEach(() => {
    connection = createMCPConnection({} as Client, {} as Transport, {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: {} as ServerConfig,
    });
  });

  test("接続を非アクティブ状態にマークできる", () => {
    markAsActive(connection);
    markAsInactive(connection);

    expect(connection.isActive).toBe(false);
  });
});

describe("healthCheck", () => {
  let mockClient: Client;
  let connection: MCPConnection;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    connection = createMCPConnection(mockClient, {} as Transport, {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: {} as ServerConfig,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("ヘルスチェックが成功する", async () => {
    const mockRequest = vi.fn().mockResolvedValue({ tools: [] });
    mockClient.request = mockRequest;

    const result = await healthCheck(connection);

    expect(result).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(
      { method: "tools/list", params: {} },
      expect.any(Object),
    );
  });

  test("ヘルスチェックが失敗する", async () => {
    const mockRequest = vi
      .fn()
      .mockRejectedValue(new Error("Connection failed"));
    mockClient.request = mockRequest;

    const result = await healthCheck(connection);

    expect(result).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe("closeConnection", () => {
  let mockClient: Client;
  let mockTransport: Transport;
  let connection: MCPConnection;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    mockTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
      onMessage: vi.fn(),
      onClose: vi.fn(),
      onError: vi.fn(),
    } as unknown as Transport;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("正常に接続を閉じることができる", async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockTransportClose = vi.fn().mockResolvedValue(undefined);
    mockClient.close = mockClose;
    mockTransport.close = mockTransportClose;

    connection = createMCPConnection(mockClient, mockTransport, {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: {} as ServerConfig,
    });

    await closeConnection(connection);

    expect(mockClose).toHaveBeenCalled();
    expect(mockTransportClose).toHaveBeenCalled();
  });

  test("クリーンアップ関数がある場合に実行される", async () => {
    const mockCleanup = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockTransportClose = vi.fn().mockResolvedValue(undefined);
    mockClient.close = mockClose;
    mockTransport.close = mockTransportClose;

    connection = createMCPConnection(
      mockClient,
      mockTransport,
      {
        userServerConfigInstanceId: "test-instance-id",
        serverName: "test-server",
        serverConfig: {} as ServerConfig,
      },
      mockCleanup,
    );

    await closeConnection(connection);

    expect(mockClose).toHaveBeenCalled();
    expect(mockTransportClose).toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();
  });

  test("エラーハンドリングが機能する", async () => {
    const mockClose = vi.fn().mockRejectedValue(new Error("Close failed"));
    mockClient.close = mockClose;

    connection = createMCPConnection(mockClient, mockTransport, {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: {} as ServerConfig,
    });

    // エラーが投げられないことを確認
    await expect(closeConnection(connection)).resolves.toBeUndefined();
  });
});

describe("createConnection", () => {
  let mockServerConfig: ServerConfig;

  beforeEach(() => {
    mockServerConfig = {
      name: "test-server",
      toolNames: ["test-tool"],
      transport: {
        type: "stdio",
        command: "test-command",
        args: ["test-arg"],
      },
    } as ServerConfig;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("stdio接続が作成される", async () => {
    const options: MCPConnectionOptions = {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: mockServerConfig,
    };

    const connection = await createConnection(mockServerConfig, options);

    expect(connection).toBeDefined();
    expect(connection.serverName).toBe("test-server");
    expect(connection.userServerConfigInstanceId).toBe("test-instance-id");
    expect(connection.isActive).toBe(false);
  });

  test("SSE接続が作成される", async () => {
    const sseConfig: ServerConfig = {
      ...mockServerConfig,
      transport: {
        type: "sse",
        url: "http://localhost:3000/sse",
      },
    };

    const options: MCPConnectionOptions = {
      userServerConfigInstanceId: "test-instance-id",
      serverName: "test-server",
      serverConfig: sseConfig,
    };

    const connection = await createConnection(sseConfig, options);

    expect(connection).toBeDefined();
    expect(connection.serverName).toBe("test-server");
  });
});
