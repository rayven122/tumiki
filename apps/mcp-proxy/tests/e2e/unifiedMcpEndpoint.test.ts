/**
 * 統合MCPエンドポイント E2Eテスト
 *
 * 統合MCPサーバー（複数の子サーバーを束ねる）のエンドツーエンドテスト。
 * モックMCPサーバーを起動し、テスト専用のHonoアプリを使用して動作を検証。
 *
 * テストフロー:
 * 1. モックMCPサーバーを起動
 * 2. テスト用DBにシードデータを投入
 * 3. テスト専用Honoアプリを作成（認証バイパス付き）
 * 4. app.request()でJSON-RPCリクエストを送信
 * 5. レスポンスを検証
 *
 * 認証テストは別途ユニットテスト（src/middleware/auth/index.test.ts）でカバー済み。
 * E2Eテストでは統合MCPの機能（ツール集約・実行）に焦点を当てる。
 */

import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { Hono } from "hono";
import { AuthType, PiiMaskingMode } from "@tumiki/db";
import { db } from "@tumiki/db/server";

// loggerをモック
vi.mock("@/libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// requestLogging contextをモック
vi.mock("@/middleware/requestLogging/context.js", () => ({
  getExecutionContext: vi.fn().mockReturnValue({
    requestStartTime: Date.now(),
    inputBytes: 0,
  }),
  updateExecutionContext: vi.fn(),
  runWithExecutionContext: vi
    .fn()
    .mockImplementation(
      async (_context: unknown, callback: () => Promise<unknown>) => {
        return callback();
      },
    ),
}));

import type { HonoEnv } from "../../src/types/index.js";
import { mcpHandler } from "../../src/handlers/mcpHandler.js";
import {
  setupTestMcpServers,
  type RunningMockMcpServer,
} from "./helpers/mockMcpServer.js";
import {
  seedUnifiedMcpTestData,
  cleanupUnifiedMcpTestData,
  TEST_UNIFIED_MCP_SERVER_ID,
  TEST_USER_ID,
  TEST_ORG_ID,
} from "./helpers/seedUnifiedMcpTestData.js";

/**
 * テスト専用のHonoアプリを作成
 *
 * 認証をバイパスし、AuthContextを直接設定してmcpHandlerを呼び出す
 */
const createTestApp = () => {
  const app = new Hono<HonoEnv>();

  // 認証をバイパスするミドルウェア
  app.use("/mcp/:serverId", async (c, next) => {
    const serverId = c.req.param("serverId");

    // AuthContextを直接設定（認証スキップ）
    c.set("authContext", {
      authMethod: AuthType.OAUTH,
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      mcpServerId: "",
      piiMaskingMode: PiiMaskingMode.DISABLED,
      piiInfoTypes: [],
      toonConversionEnabled: false,
      isUnifiedEndpoint: true,
      unifiedMcpServerId: serverId,
    });

    await next();
  });

  // MCPハンドラーをマウント
  app.post("/mcp/:serverId", mcpHandler);

  return app;
};

/**
 * JSON-RPCリクエストを送信するヘルパー関数
 *
 * app.request()を使用してテスト専用アプリにリクエストを送信
 */
const sendJsonRpcRequest = async (
  app: Hono<HonoEnv>,
  serverId: string,
  method: string,
  params: Record<string, unknown> = {},
  id = 1,
): Promise<Response> => {
  return app.request(`/mcp/${serverId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // MCP SDKは両方のAcceptタイプを要求
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });
};

describe("統合MCPエンドポイント E2Eテスト", () => {
  let app: Hono<HonoEnv>;
  let mockServerA: RunningMockMcpServer;
  let mockServerB: RunningMockMcpServer;

  beforeAll(async () => {
    // 1. モックMCPサーバーを起動
    console.log("\n📦 モックMCPサーバーを起動中...");
    const servers = await setupTestMcpServers();
    mockServerA = servers.serverA;
    mockServerB = servers.serverB;

    // 2. テストDBにシードデータを投入
    console.log("📊 テストデータをシード中...");
    await seedUnifiedMcpTestData(mockServerA.url, mockServerB.url);

    // 3. テストアプリを作成
    app = createTestApp();

    console.log("✅ セットアップ完了\n");
  }, 30000);

  afterAll(async () => {
    console.log("\n🧹 クリーンアップ中...");

    // モックサーバーを停止
    if (mockServerA) {
      await mockServerA.stop();
    }
    if (mockServerB) {
      await mockServerB.stop();
    }

    // テストデータをクリーンアップ
    await cleanupUnifiedMcpTestData();

    // DB接続を閉じる
    await db.$disconnect();

    console.log("✅ クリーンアップ完了\n");
  });

  describe("initialize", () => {
    test("統合MCPサーバーとしてinitializeに成功する", async () => {
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        jsonrpc: string;
        id: number;
        result?: {
          protocolVersion: string;
          capabilities: Record<string, unknown>;
          serverInfo: {
            name: string;
            version: string;
          };
        };
        error?: unknown;
      };

      expect(body.jsonrpc).toBe("2.0");
      expect(body.id).toBe(1);
      expect(body.result).toBeDefined();
      expect(body.result?.protocolVersion).toBe("2024-11-05");
      expect(body.result?.serverInfo.name).toBe("E2E Test Unified MCP Server");
    });
  });

  describe("tools/list", () => {
    test("2つの子サーバーから集約された3つのツールを返す", async () => {
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/list",
        {},
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        jsonrpc: string;
        id: number;
        result?: {
          tools: Array<{
            name: string;
            description: string;
            inputSchema: Record<string, unknown>;
          }>;
        };
        error?: unknown;
      };

      expect(body.jsonrpc).toBe("2.0");
      expect(body.result).toBeDefined();
      expect(body.result?.tools).toBeDefined();

      // 3つのツールが返される（echo, add from ServerA, multiply from ServerB）
      expect(body.result?.tools.length).toBe(3);

      // ツール名が3階層フォーマット（{mcpServerId}__{instanceNormalizedName}__{toolName}）になっていることを確認
      const toolNames = body.result?.tools.map((t) => t.name);
      // 形式: mcp_server_a_e2e__instance_a__echo
      expect(toolNames).toContain("mcp_server_a_e2e__instance_a__echo");
      expect(toolNames).toContain("mcp_server_a_e2e__instance_a__add");
      expect(toolNames).toContain("mcp_server_b_e2e__instance_b__multiply");
    });

    test("ツールの説明とinputSchemaが正しく含まれる", async () => {
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/list",
        {},
      );

      const body = (await response.json()) as {
        result?: {
          tools: Array<{
            name: string;
            description: string;
            inputSchema: Record<string, unknown>;
          }>;
        };
      };

      const echoTool = body.result?.tools.find((t) => t.name.includes("echo"));
      expect(echoTool).toBeDefined();
      expect(echoTool?.description).toBe("Echoes the input message");
      expect(echoTool?.inputSchema).toBeDefined();
    });
  });

  describe("tools/call", () => {
    test("サーバーAのechoツールを3階層フォーマットで実行できる", async () => {
      // まずツール一覧を取得して正確なツール名を取得
      const listResponse = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/list",
        {},
      );
      const listBody = (await listResponse.json()) as {
        result?: {
          tools: Array<{ name: string }>;
        };
      };

      const echoToolName = listBody.result?.tools.find((t) =>
        t.name.includes("echo"),
      )?.name;

      expect(echoToolName).toBeDefined();

      // echoツールを実行
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/call",
        {
          name: echoToolName,
          arguments: { message: "Hello, E2E Test!" },
        },
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        jsonrpc: string;
        id: number;
        result?: {
          content: Array<{ type: string; text: string }>;
        };
        error?: unknown;
      };

      expect(body.result).toBeDefined();
      expect(body.result?.content).toBeDefined();
      expect(body.result?.content[0]?.text).toBe("Echo: Hello, E2E Test!");
    });

    test("サーバーAのaddツールを実行できる", async () => {
      // ツール一覧を取得
      const listResponse = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/list",
        {},
      );
      const listBody = (await listResponse.json()) as {
        result?: {
          tools: Array<{ name: string }>;
        };
      };

      const addToolName = listBody.result?.tools.find((t) =>
        t.name.includes("add"),
      )?.name;

      expect(addToolName).toBeDefined();

      // addツールを実行
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/call",
        {
          name: addToolName,
          arguments: { a: 5, b: 3 },
        },
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        result?: {
          content: Array<{ type: string; text: string }>;
        };
      };

      expect(body.result?.content[0]?.text).toBe("Result: 8");
    });

    test("サーバーBのmultiplyツールを実行できる", async () => {
      // ツール一覧を取得
      const listResponse = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/list",
        {},
      );
      const listBody = (await listResponse.json()) as {
        result?: {
          tools: Array<{ name: string }>;
        };
      };

      const multiplyToolName = listBody.result?.tools.find((t) =>
        t.name.includes("multiply"),
      )?.name;

      expect(multiplyToolName).toBeDefined();

      // multiplyツールを実行
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/call",
        {
          name: multiplyToolName,
          arguments: { a: 4, b: 7 },
        },
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        result?: {
          content: Array<{ type: string; text: string }>;
        };
      };

      expect(body.result?.content[0]?.text).toBe("Result: 28");
    });

    test("存在しないツールを呼び出すとエラーを返す", async () => {
      const response = await sendJsonRpcRequest(
        app,
        TEST_UNIFIED_MCP_SERVER_ID,
        "tools/call",
        {
          name: "non_existent__instance__tool",
          arguments: {},
        },
      );

      // JSON-RPCエラーレスポンスを検証
      const body = (await response.json()) as {
        error?: {
          code: number;
          message: string;
        };
      };

      expect(body.error).toBeDefined();
    });
  });
});
