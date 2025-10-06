#!/usr/bin/env node

// テスト用のモックMCPサーバー
// MCPプロトコルに従ったシンプルなstdioサーバー

import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// JSON-RPCレスポンスを送信
function sendResponse(id: number | string | null, result: unknown): void {
  const response = {
    jsonrpc: "2.0",
    id: id,
    result: result,
  };
  process.stdout.write(JSON.stringify(response) + "\n");
}

// JSON-RPCエラーを送信
function sendError(
  id: number | string | null,
  code: number,
  message: string,
): void {
  const response = {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: code,
      message: message,
    },
  };
  process.stdout.write(JSON.stringify(response) + "\n");
}

rl.on("line", (line: string) => {
  try {
    const request = JSON.parse(line) as {
      jsonrpc?: string;
      id?: number | string | null;
      method?: string;
      params?: {
        arguments?: {
          message?: string;
        };
      };
    };

    // JSON-RPCリクエストの検証
    if (request.jsonrpc !== "2.0" || !request.method) {
      sendError(request.id ?? null, -32600, "Invalid Request");
      return;
    }

    // メソッドに応じた処理
    switch (request.method) {
      case "initialize":
        sendResponse(request.id ?? null, {
          protocolVersion: "0.1.0",
          serverInfo: {
            name: "test-server",
            version: "1.0.0",
          },
          capabilities: {
            tools: {},
          },
        });
        break;

      case "tools/list":
        sendResponse(request.id ?? null, {
          tools: [
            {
              name: "test-tool",
              description: "A test tool",
              inputSchema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
              },
            },
          ],
        });
        break;

      case "tools/call":
        sendResponse(request.id ?? null, {
          content: [
            {
              type: "text",
              text: `Test response: ${request.params?.arguments?.message ?? "default"}`,
            },
          ],
        });
        break;

      default:
        sendError(request.id ?? null, -32601, "Method not found");
    }
  } catch {
    // パースエラーなど
    sendError(null, -32700, "Parse error");
  }
});

// プロセス終了時のクリーンアップ
process.on("SIGINT", () => {
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
