#!/usr/bin/env node
/**
 * Google Calendar MCP Server Manual E2E Test
 *
 * このスクリプトはMCPサーバーに直接接続してE2Eテストを実行します
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テスト結果を保存
const testResults = {
  passed: [],
  failed: [],
  errors: [],
};

// MCPサーバープロセスを起動
const serverPath = path.join(__dirname, "dist", "index.js");
const mcpServer = spawn("node", [serverPath], {
  env: {
    ...process.env,
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
let currentTestName = "";

// MCPサーバーからの出力を処理
mcpServer.stdout.on("data", (data) => {
  buffer += data.toString();

  // 改行で区切られた完全なJSONメッセージを処理
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // 最後の不完全な行はバッファに保持

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log(
          `\n[Response for ${currentTestName}]:`,
          JSON.stringify(response, null, 2),
        );

        if (response.error) {
          testResults.failed.push({
            test: currentTestName,
            error: response.error,
          });
        } else {
          testResults.passed.push({
            test: currentTestName,
            result: response.result,
          });
        }
      } catch (e) {
        console.error("JSON parse error:", e.message);
        console.error("Line:", line);
      }
    }
  }
});

mcpServer.stderr.on("data", (data) => {
  console.error("Server stderr:", data.toString());
});

// MCPリクエストを送信するヘルパー関数
const sendMcpRequest = (method, params = {}) => {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: method,
    params: params,
  };

  console.log(`\n[Sending ${method}]:`, JSON.stringify(request, null, 2));
  mcpServer.stdin.write(JSON.stringify(request) + "\n");
};

// テストを順番に実行
const runTests = async () => {
  // 少し待機してサーバーが準備完了するまで待つ
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n=== Google Calendar MCP E2E Tests ===\n");

  // 1. Initialize
  currentTestName = "initialize";
  sendMcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0",
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 2. List tools
  currentTestName = "tools/list";
  sendMcpRequest("tools/list");

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Test list_calendars
  currentTestName = "list_calendars";
  sendMcpRequest("tools/call", {
    name: "list_calendars",
    arguments: {
      maxResults: 10,
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Test get_calendar (primary)
  currentTestName = "get_calendar_primary";
  sendMcpRequest("tools/call", {
    name: "get_calendar",
    arguments: {
      calendarId: "primary",
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Test list_events
  currentTestName = "list_events";
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  sendMcpRequest("tools/call", {
    name: "list_events",
    arguments: {
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 6. Test create_event
  currentTestName = "create_event";
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 明日
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1時間後

  sendMcpRequest("tools/call", {
    name: "create_event",
    arguments: {
      calendarId: "primary",
      summary: "E2Eテストイベント",
      description: "Google Calendar MCP E2Eテストで作成されたイベント",
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Asia/Tokyo",
      },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 7. Test search_events
  currentTestName = "search_events";
  sendMcpRequest("tools/call", {
    name: "search_events",
    arguments: {
      calendarId: "primary",
      q: "E2Eテスト",
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 8. Test get_freebusy
  currentTestName = "get_freebusy";
  sendMcpRequest("tools/call", {
    name: "get_freebusy",
    arguments: {
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      calendarIds: ["primary"],
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 9. Test get_colors
  currentTestName = "get_colors";
  sendMcpRequest("tools/call", {
    name: "get_colors",
    arguments: {},
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // テスト完了
  console.log("\n=== Test Results ===\n");
  console.log(`Passed: ${testResults.passed.length}`);
  console.log(`Failed: ${testResults.failed.length}`);
  console.log(`Errors: ${testResults.errors.length}`);

  if (testResults.failed.length > 0) {
    console.log("\nFailed tests:");
    testResults.failed.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${JSON.stringify(error)}`);
    });
  }

  mcpServer.kill();
  process.exit(testResults.failed.length > 0 ? 1 : 0);
};

// エラーハンドリング
mcpServer.on("error", (error) => {
  console.error("Failed to start MCP server:", error);
  testResults.errors.push({ error: error.message });
  process.exit(1);
});

mcpServer.on("exit", (code) => {
  console.log(`\nMCP server exited with code ${code}`);
});

// テスト開始
runTests().catch((error) => {
  console.error("Test execution error:", error);
  mcpServer.kill();
  process.exit(1);
});
