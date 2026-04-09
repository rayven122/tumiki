import { beforeEach, describe, expect, test, vi } from "vitest";

import type { UpstreamClient } from "../outbound/upstream-client.js";
import type { Logger } from "../types.js";
import { createToolAggregator } from "../outbound/tool-aggregator.js";
import { createMockLogger } from "./test-helpers.js";

const createMockClient = (
  name: string,
  overrides?: Partial<UpstreamClient>,
): UpstreamClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  listTools: vi.fn().mockResolvedValue([]),
  callTool: vi.fn().mockResolvedValue({ content: [], isError: false }),
  getStatus: vi.fn().mockReturnValue("running"),
  getName: () => name,
  getLastError: vi.fn().mockReturnValue(undefined),
  onStatusChange: vi.fn(),
  ...overrides,
});

describe("ToolAggregator", () => {
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
  });

  describe("listTools", () => {
    test("ツール名にサーバー名プレフィックスが付与される", async () => {
      const client = createMockClient("serena", {
        listTools: vi.fn().mockResolvedValue([
          {
            name: "read_file",
            description: "ファイル読み取り",
            inputSchema: {},
          },
          {
            name: "write_file",
            description: "ファイル書き込み",
            inputSchema: {},
          },
        ]),
      });
      const clients = new Map([["serena", client]]);
      const aggregator = createToolAggregator(clients, mockLogger);

      const tools = await aggregator.listTools();

      expect(tools).toStrictEqual([
        {
          name: "serena__read_file",
          description: "ファイル読み取り",
          inputSchema: {},
          serverName: "serena",
        },
        {
          name: "serena__write_file",
          description: "ファイル書き込み",
          inputSchema: {},
          serverName: "serena",
        },
      ]);
    });

    test("複数サーバーのツールを集約する", async () => {
      const serenaClient = createMockClient("serena", {
        listTools: vi
          .fn()
          .mockResolvedValue([
            { name: "read_file", description: "desc", inputSchema: {} },
          ]),
      });
      const githubClient = createMockClient("github", {
        listTools: vi
          .fn()
          .mockResolvedValue([
            { name: "list_repos", description: "desc", inputSchema: {} },
          ]),
      });
      const clients = new Map([
        ["serena", serenaClient],
        ["github", githubClient],
      ]);
      const aggregator = createToolAggregator(clients, mockLogger);

      const tools = await aggregator.listTools();

      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toStrictEqual([
        "serena__read_file",
        "github__list_repos",
      ]);
    });

    test("同名ツールがあってもプレフィックスで区別される", async () => {
      const serenaClient = createMockClient("serena", {
        listTools: vi
          .fn()
          .mockResolvedValue([
            { name: "read_file", description: "Serena版", inputSchema: {} },
          ]),
      });
      const otherClient = createMockClient("other", {
        listTools: vi
          .fn()
          .mockResolvedValue([
            { name: "read_file", description: "Other版", inputSchema: {} },
          ]),
      });
      const clients = new Map([
        ["serena", serenaClient],
        ["other", otherClient],
      ]);
      const aggregator = createToolAggregator(clients, mockLogger);

      const tools = await aggregator.listTools();

      expect(tools).toHaveLength(2);
      expect(tools[0]?.name).toBe("serena__read_file");
      expect(tools[1]?.name).toBe("other__read_file");
    });

    test("ツール取得に失敗したサーバーはスキップしてエラーログを出す", async () => {
      const goodClient = createMockClient("good", {
        listTools: vi
          .fn()
          .mockResolvedValue([
            { name: "tool1", description: "desc", inputSchema: {} },
          ]),
      });
      const badClient = createMockClient("bad", {
        listTools: vi.fn().mockRejectedValue(new Error("接続エラー")),
      });
      const clients = new Map([
        ["good", goodClient],
        ["bad", badClient],
      ]);
      const aggregator = createToolAggregator(clients, mockLogger);

      const tools = await aggregator.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe("good__tool1");
      expect(mockLogger.error).toHaveBeenCalledOnce();
    });

    test("クライアントが0件の場合は空配列を返す", async () => {
      const clients = new Map<string, UpstreamClient>();
      const aggregator = createToolAggregator(clients, mockLogger);

      const tools = await aggregator.listTools();

      expect(tools).toStrictEqual([]);
    });
  });

  describe("callTool", () => {
    test("プレフィックスから対象サーバーを特定して元のツール名で実行する", async () => {
      const mockCallTool = vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });
      const client = createMockClient("serena", { callTool: mockCallTool });
      const clients = new Map([["serena", client]]);
      const aggregator = createToolAggregator(clients, mockLogger);

      const result = await aggregator.callTool("serena__read_file", {
        path: "/tmp/test",
      });

      expect(mockCallTool).toHaveBeenCalledWith("read_file", {
        path: "/tmp/test",
      });
      expect(result).toStrictEqual({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });
    });

    test("存在しないサーバー名の場合はエラーになる", async () => {
      const clients = new Map<string, UpstreamClient>();
      const aggregator = createToolAggregator(clients, mockLogger);

      await expect(aggregator.callTool("unknown__tool1", {})).rejects.toThrow(
        'サーバー "unknown" が見つかりません',
      );
    });

    test("プレフィックスのないツール名の場合はエラーになる", async () => {
      const clients = new Map<string, UpstreamClient>();
      const aggregator = createToolAggregator(clients, mockLogger);

      await expect(aggregator.callTool("tool1", {})).rejects.toThrow(
        "フォーマットが不正です",
      );
    });

    test("サーバーが稼働していない場合はエラーになる", async () => {
      const client = createMockClient("serena", {
        getStatus: vi.fn().mockReturnValue("error"),
      });
      const clients = new Map([["serena", client]]);
      const aggregator = createToolAggregator(clients, mockLogger);

      await expect(
        aggregator.callTool("serena__read_file", {}),
      ).rejects.toThrow("稼働していません");
    });

    test("ツール名に複数の__が含まれる場合は最初の__で分割する", async () => {
      const mockCallTool = vi.fn().mockResolvedValue({
        content: [],
        isError: false,
      });
      const client = createMockClient("serena", { callTool: mockCallTool });
      const clients = new Map([["serena", client]]);
      const aggregator = createToolAggregator(clients, mockLogger);

      await aggregator.callTool("serena__some__tool", {});

      expect(mockCallTool).toHaveBeenCalledWith("some__tool", {});
    });
  });
});
