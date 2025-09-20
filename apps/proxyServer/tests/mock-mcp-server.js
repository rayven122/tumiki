#!/usr/bin/env node

// より堅牢なモックMCPサーバー実装
// MCPプロトコルに準拠した正しいJSON-RPC通信を実装

const readline = require("readline");

// デバッグログを標準エラーに出力（テストの邪魔にならない）
function debug(message) {
  if (process.env.DEBUG_MCP_MOCK) {
    process.stderr.write(`[mock-mcp-server] ${message}\n`);
  }
}

// JSON-RPCレスポンスを送信
function sendResponse(id, result) {
  const response = {
    jsonrpc: "2.0",
    id: id,
    result: result,
  };
  const message = JSON.stringify(response);
  process.stdout.write(message + "\n");
  debug(`Sent response: ${message}`);
}

// JSON-RPCエラーを送信
function sendError(id, code, message) {
  const response = {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: code,
      message: message,
    },
  };
  const errorMessage = JSON.stringify(response);
  process.stdout.write(errorMessage + "\n");
  debug(`Sent error: ${errorMessage}`);
}

// 接続状態を管理
let initialized = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  debug(`Received: ${line}`);

  try {
    const request = JSON.parse(line);

    // JSON-RPCリクエストの基本検証
    if (request.jsonrpc !== "2.0") {
      sendError(
        request.id || null,
        -32600,
        "Invalid Request: jsonrpc must be 2.0",
      );
      return;
    }

    if (!request.method) {
      sendError(
        request.id || null,
        -32600,
        "Invalid Request: method is required",
      );
      return;
    }

    // メソッドに応じた処理
    switch (request.method) {
      case "initialize":
        if (initialized) {
          sendError(request.id, -32603, "Already initialized");
        } else {
          initialized = true;
          sendResponse(request.id, {
            protocolVersion: "0.1.0",
            serverInfo: {
              name: "mock-mcp-server",
              version: "1.0.0",
            },
            capabilities: {
              tools: {},
              resources: {},
            },
          });
        }
        break;

      case "tools/list":
        if (!initialized) {
          sendError(request.id, -32603, "Not initialized");
        } else {
          sendResponse(request.id, {
            tools: [
              {
                name: "echo",
                description: "Echo back the input message",
                inputSchema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description: "Message to echo back",
                    },
                  },
                  required: ["message"],
                },
              },
              {
                name: "ping",
                description: "Simple ping tool",
                inputSchema: {
                  type: "object",
                  properties: {},
                },
              },
            ],
          });
        }
        break;

      case "tools/call":
        if (!initialized) {
          sendError(request.id, -32603, "Not initialized");
        } else {
          const toolName = request.params?.name;
          const args = request.params?.arguments || {};

          if (toolName === "echo") {
            sendResponse(request.id, {
              content: [
                {
                  type: "text",
                  text: `Echo: ${args.message || "No message provided"}`,
                },
              ],
            });
          } else if (toolName === "ping") {
            sendResponse(request.id, {
              content: [
                {
                  type: "text",
                  text: "pong",
                },
              ],
            });
          } else {
            sendError(request.id, -32602, `Unknown tool: ${toolName}`);
          }
        }
        break;

      case "resources/list":
        if (!initialized) {
          sendError(request.id, -32603, "Not initialized");
        } else {
          sendResponse(request.id, {
            resources: [],
          });
        }
        break;

      case "ping":
        // Keep-alive ping
        sendResponse(request.id, {});
        break;

      default:
        sendError(request.id, -32601, `Method not found: ${request.method}`);
    }
  } catch (error) {
    debug(`Parse error: ${error.message}`);
    sendError(null, -32700, "Parse error");
  }
});

// エラーハンドリング
rl.on("error", (error) => {
  debug(`Readline error: ${error.message}`);
});

// プロセス終了時のクリーンアップ
process.on("SIGINT", () => {
  debug("Received SIGINT, exiting...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  debug("Received SIGTERM, exiting...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  debug(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// 起動メッセージ
debug("Mock MCP server started");
