import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProxyHooks } from "../cli.js";
import type { ProxyCore } from "../core.js";
import type { ToolCallEvent } from "../types.js";
import { createMockLogger } from "./test-helpers.js";

// MCP SDK のモック
const mockServerSetRequestHandler = vi.fn();
const mockServerConnect = vi.fn().mockResolvedValue(undefined);
// onToolCall フック内で server.getClientVersion() を呼ぶため mock 化（未指定時は undefined を返す）
const mockServerGetClientVersion = vi.fn().mockReturnValue(undefined);

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: mockServerSetRequestHandler,
    connect: mockServerConnect,
    getClientVersion: mockServerGetClientVersion,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  CallToolRequestSchema: Symbol("CallToolRequestSchema"),
  ListToolsRequestSchema: Symbol("ListToolsRequestSchema"),
}));

const { startStdioInbound } = await import("../inbound/stdio-inbound.js");
const { CallToolRequestSchema } =
  await import("@modelcontextprotocol/sdk/types.js");

/** テスト用のProxyCoreモックを生成 */
const createMockCore = (overrides: Partial<ProxyCore> = {}): ProxyCore => ({
  startAll: vi.fn().mockResolvedValue(undefined),
  stopAll: vi.fn().mockResolvedValue(undefined),
  start: vi.fn(),
  stop: vi.fn(),
  listTools: vi.fn().mockResolvedValue([]),
  callTool: vi.fn().mockResolvedValue({ content: [], isError: false }),
  getStatus: vi.fn().mockReturnValue([]),
  onStatusChange: vi.fn(),
  ...overrides,
});

/** setRequestHandler に登録された tools/call ハンドラーを取得 */
const getCallToolHandler = () => {
  const calls = mockServerSetRequestHandler.mock.calls as unknown[][];
  const call = calls.find((args) => args[0] === CallToolRequestSchema);
  if (!call) throw new Error("CallToolRequestSchema ハンドラーが未登録です");
  return call[1] as (request: {
    params: { name: string; arguments?: Record<string, unknown> };
  }) => Promise<unknown>;
};

describe("stdio-inbound フック", () => {
  const mockLogger = createMockLogger();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ツール成功時に onToolCall が正しいイベントで呼ばれる", async () => {
    const onToolCall = vi.fn();
    const hooks: ProxyHooks = { onToolCall };
    const resultContent = [{ type: "text", text: "ok" }];
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: resultContent,
        isError: false,
      }),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    await handler({
      params: { name: "server__tool", arguments: { key: "value" } },
    });

    // fire-and-forget なので次のマイクロタスクまで待つ
    await vi.waitFor(() => {
      expect(onToolCall).toHaveBeenCalledOnce();
    });

    const event = onToolCall.mock.calls[0]![0] as ToolCallEvent;
    expect(event.prefixedToolName).toBe("server__tool");
    expect(event.args).toStrictEqual({ key: "value" });
    expect(event.isSuccess).toBe(true);
    expect(event.errorMessage).toBeUndefined();
    expect(event.resultContent).toStrictEqual(resultContent);
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("ツールがisError=trueの場合にisSuccess=falseとerrorMessageが設定される", async () => {
    const onToolCall = vi.fn();
    const hooks: ProxyHooks = { onToolCall };
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "something went wrong" }],
        isError: true,
      }),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    await handler({ params: { name: "server__tool", arguments: {} } });

    await vi.waitFor(() => {
      expect(onToolCall).toHaveBeenCalledOnce();
    });

    const event = onToolCall.mock.calls[0]![0] as ToolCallEvent;
    expect(event.isSuccess).toBe(false);
    expect(event.errorMessage).toBe("something went wrong");
  });

  test("ツール実行が例外をスローした場合にisSuccess=falseとerrorMessageが設定される", async () => {
    const onToolCall = vi.fn();
    const hooks: ProxyHooks = { onToolCall };
    const core = createMockCore({
      callTool: vi.fn().mockRejectedValue(new Error("connection timeout")),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    const result = await handler({
      params: { name: "server__tool", arguments: {} },
    });

    await vi.waitFor(() => {
      expect(onToolCall).toHaveBeenCalledOnce();
    });

    const event = onToolCall.mock.calls[0]![0] as ToolCallEvent;
    expect(event.isSuccess).toBe(false);
    expect(event.errorMessage).toBe("connection timeout");
    expect(event.resultContent).toStrictEqual([]);

    // レスポンスもエラーとして返る
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "エラー: connection timeout" }],
      isError: true,
    });
  });

  test("onToolCall がエラーをスローしてもツール応答には影響しない", async () => {
    const onToolCall = vi.fn().mockRejectedValue(new Error("DB write failed"));
    const hooks: ProxyHooks = { onToolCall };
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "ok" }],
        isError: false,
      }),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    // フックのエラーがハンドラーの戻り値に影響しないことを確認
    const result = await handler({
      params: { name: "server__tool", arguments: {} },
    });

    expect(result).toStrictEqual({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });

    // エラーログが出力される
    await vi.waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        "ツール実行フックでエラーが発生しました",
        expect.any(Object),
      );
    });
  });

  test("hooks が未指定でも正常に動作する", async () => {
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "ok" }],
        isError: false,
      }),
    });

    await startStdioInbound(core, mockLogger);
    const handler = getCallToolHandler();

    const result = await handler({
      params: { name: "server__tool", arguments: { a: 1 } },
    });

    expect(result).toStrictEqual({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });
  });

  test("arguments が未指定の場合に空オブジェクトが使われる", async () => {
    const onToolCall = vi.fn();
    const hooks: ProxyHooks = { onToolCall };
    const core = createMockCore();

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    await handler({ params: { name: "server__tool" } });

    expect(core.callTool).toHaveBeenCalledWith("server__tool", {});

    await vi.waitFor(() => {
      expect(onToolCall).toHaveBeenCalledOnce();
    });

    const event = onToolCall.mock.calls[0]![0] as ToolCallEvent;
    expect(event.args).toStrictEqual({});
  });

  test("enableToonConversion=true 時に result.content[].text が TOON エンコードされる", async () => {
    const longJson = JSON.stringify({
      users: [
        { id: 1, name: "alice" },
        { id: 2, name: "bob" },
        { id: 3, name: "carol" },
      ],
    });
    const hooks: ProxyHooks = { enableToonConversion: true };
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: longJson }],
        isError: false,
      }),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    const result = (await handler({
      params: { name: "server__tool", arguments: {} },
    })) as { content: { type: string; text: string }[] };

    // 元の JSON 文字列より短くなっている（TOON 圧縮済み）
    expect(result.content[0]!.text.length).toBeLessThan(longJson.length);
    // 元の JSON とは形式が異なる（{ users: ... } から TOON 形式へ）
    expect(result.content[0]!.text).not.toBe(longJson);
  });

  test("enableToonConversion=false（既定）時は素通しで返却される", async () => {
    const longJson = JSON.stringify({
      users: [
        { id: 1, name: "alice" },
        { id: 2, name: "bob" },
        { id: 3, name: "carol" },
      ],
    });
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: longJson }],
        isError: false,
      }),
    });

    await startStdioInbound(core, mockLogger);
    const handler = getCallToolHandler();

    const result = (await handler({
      params: { name: "server__tool", arguments: {} },
    })) as { content: { type: string; text: string }[] };

    // TOON 化されておらず元の JSON のまま
    expect(result.content[0]!.text).toBe(longJson);
  });

  test("isError=true のレスポンスは enableToonConversion=true でも TOON 変換されない", async () => {
    const errorJson = JSON.stringify({
      errors: Array.from({ length: 10 }, (_, i) => ({
        code: i,
        message: `error_${i}`,
      })),
    });
    const hooks: ProxyHooks = { enableToonConversion: true };
    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: errorJson }],
        isError: true,
      }),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    const result = (await handler({
      params: { name: "server__tool", arguments: {} },
    })) as { content: { type: string; text: string }[]; isError: boolean };

    // エラーレスポンスは TOON 変換されず元の JSON 文字列のまま返る
    expect(result.content[0]!.text).toBe(errorJson);
    expect(result.isError).toBe(true);
  });

  test("マスキング復号 → TOON 変換 の順で適用され、マスクトークンが TOON 化されない", async () => {
    // upstream からは [EMAIL_1234] を含むマスク済みのレスポンスが返る想定
    const maskedJson = JSON.stringify({
      users: [
        { id: 1, contact: "[EMAIL_1234]" },
        { id: 2, contact: "[EMAIL_5678]" },
      ],
    });
    // afterCall でマスクが復号され、生のメールアドレスを含む JSON に戻る想定
    const decryptedJson = JSON.stringify({
      users: [
        { id: 1, contact: "alice@example.com" },
        { id: 2, contact: "bob@example.com" },
      ],
    });

    const afterCall = vi.fn(
      async (_context: unknown, _result: { content: unknown[] }) => ({
        content: [{ type: "text" as const, text: decryptedJson }],
        isError: false,
      }),
    );

    const hooks: ProxyHooks = {
      enableToonConversion: true,
      filter: {
        beforeCall: vi.fn(
          async (_name: string, args: Record<string, unknown>) => ({
            args,
            context: {},
          }),
        ),
        afterCall,
      },
    };

    const core = createMockCore({
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: maskedJson }],
        isError: false,
      }),
    });

    await startStdioInbound(core, mockLogger, hooks);
    const handler = getCallToolHandler();

    const result = (await handler({
      params: { name: "server__tool", arguments: {} },
    })) as { content: { type: string; text: string }[] };

    // afterCall は復号後の生メールアドレスを含むテキストを受け取る（TOON 化前のマスク済み JSON）
    const afterCallResult = afterCall.mock.calls[0]![1] as {
      content: { type: string; text: string }[];
    };
    expect(afterCallResult.content[0]!.text).toContain("[EMAIL_1234]");

    // 最終レスポンスはマスクトークンを含まず、復号後のメールアドレスが TOON 化されている
    const finalText = result.content[0]!.text;
    expect(finalText).not.toContain("[EMAIL_1234]");
    expect(finalText).toContain("alice@example.com");
    // 元の JSON より短くなっている（TOON 圧縮済み）
    expect(finalText.length).toBeLessThan(decryptedJson.length);
  });
});
