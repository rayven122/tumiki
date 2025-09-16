/**
 * MCP Proxy Server接続テストスクリプト
 * 複数の認証方式（レガシー、Instance ID、クエリパラメータ、SSE）をサポート
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// 環境変数から設定を取得
const API_KEY = process.env.TEST_API_KEY || "tumiki_mcp_xxxxxx";
const INSTANCE_ID = process.env.MCP_INSTANCE_ID || "";
const PROXY_URL = process.env.MCP_PROXY_URL || "http://localhost:8080";
const TEST_MODE = process.env.TEST_MODE || "both"; // デフォルトは両方テスト
const DEBUG_MODE = process.env.DEBUG_MODE === "true";

// テスト結果を格納
type TestResult = {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
};

const testResults: TestResult[] = [];

/**
 * デバッグログ出力
 */
function debugLog(...args: unknown[]) {
  if (DEBUG_MODE) {
    console.log("🔍 [DEBUG]", ...args);
  }
}

/**
 * テスト結果を記録
 */
function recordResult(
  name: string,
  success: boolean,
  duration: number,
  error?: string,
  details?: Record<string, unknown>,
) {
  testResults.push({ name, success, duration, error, details });
}

/**
 * Instance ID認証テスト（Streamable HTTP）
 */
async function testInstanceIdAuth() {
  if (!INSTANCE_ID) {
    console.log("⚠️ Skipping Instance ID auth test (MCP_INSTANCE_ID not set)");
    return false;
  }

  console.log("🧪 Testing Instance ID Authentication (HTTP Transport)...");
  console.log(`📍 URL: ${PROXY_URL}/mcp/${INSTANCE_ID}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);

  const startTime = Date.now();

  try {
    debugLog("Creating transport with headers:", { "x-api-key": API_KEY });

    const transport = new StreamableHTTPClientTransport(
      new URL(`${PROXY_URL}/mcp/${INSTANCE_ID}`),
      {
        requestInit: {
          headers: {
            "x-api-key": API_KEY,
          },
        },
      },
    );

    const client = new Client(
      {
        name: "test-client-instance-id",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          sampling: {},
        },
      },
    );

    await client.connect(transport);
    console.log("✅ Instance ID auth: Connected successfully!");

    const toolsResponse = await client.listTools();
    console.log(
      `✅ Instance ID auth: Found ${toolsResponse.tools?.length || 0} tools`,
    );

    if (DEBUG_MODE && toolsResponse.tools && toolsResponse.tools.length > 0) {
      console.log("📋 Available tools:");
      toolsResponse.tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name}`);
      });
    }

    await client.close();

    const duration = Date.now() - startTime;
    recordResult("Instance ID Auth (HTTP)", true, duration, undefined, {
      instanceId: INSTANCE_ID,
      toolsCount: toolsResponse.tools?.length || 0,
    });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Instance ID auth failed: ${errorMsg}`);

    // 詳細なエラー情報
    if (error instanceof Error) {
      if (error.message.includes("401")) {
        console.error(
          "💡 認証エラー: API Keyが無効またはInstance IDと一致しません",
        );
      } else if (error.message.includes("404")) {
        console.error("💡 Not Found: Instance IDが存在しません");
      }
    }

    recordResult("Instance ID Auth (HTTP)", false, duration, errorMsg, {
      instanceId: INSTANCE_ID,
    });
    return false;
  }
}

/**
 * クエリパラメータ認証テスト（レガシーエンドポイント）
 */
async function testQueryParamAuth() {
  console.log("🧪 Testing Query Parameter Authentication (Legacy Endpoint)...");
  console.log(
    `📍 URL: ${PROXY_URL}/mcp?api-key=${API_KEY.substring(0, 20)}...`,
  );

  const startTime = Date.now();

  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(`${PROXY_URL}/mcp?api-key=${API_KEY}`),
    );

    const client = new Client(
      {
        name: "test-client-query-param",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          sampling: {},
        },
      },
    );

    await client.connect(transport);
    console.log("✅ Query param auth: Connected successfully!");

    const toolsResponse = await client.listTools();
    console.log(
      `✅ Query param auth: Found ${toolsResponse.tools?.length || 0} tools`,
    );

    await client.close();

    const duration = Date.now() - startTime;
    recordResult("Query Param Auth", true, duration, undefined, {
      instanceId: INSTANCE_ID,
      toolsCount: toolsResponse.tools?.length || 0,
    });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Query param auth failed: ${errorMsg}`);
    recordResult("Query Param Auth", false, duration, errorMsg, {
      instanceId: INSTANCE_ID,
    });
    return false;
  }
}

/**
 * Query ParameterとInstance ID認証をテスト（デフォルト）
 */
async function testBothAuthMethods() {
  console.log("🎯 Testing Query Parameter & Instance ID Authentication");
  console.log("=".repeat(50));
  console.log("");

  const tests = [
    { name: "Query Parameter Auth", fn: testQueryParamAuth },
    { name: "Instance ID Auth (HTTP)", fn: testInstanceIdAuth },
  ];

  for (const test of tests) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📋 ${test.name}`);
    console.log(`${"=".repeat(50)}\n`);

    try {
      await test.fn();
    } catch (error) {
      console.error(`❌ Unexpected error in ${test.name}:`, error);
    }

    // テスト間に少し待機
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // サマリーを表示
  displaySummary();
}

/**
 * テスト結果のサマリーを表示
 */
function displaySummary() {
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));

  const successCount = testResults.filter((r) => r.success).length;
  const failureCount = testResults.filter((r) => !r.success).length;

  console.log(`\n✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(
    `📈 Success Rate: ${((successCount / testResults.length) * 100).toFixed(1)}%\n`,
  );

  console.log("Detailed Results:");
  console.log("-".repeat(50));

  testResults.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    const duration = `${result.duration}ms`;
    console.log(`${status} ${result.name.padEnd(25)} ${duration.padStart(8)}`);

    if (!result.success && result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }

    if (DEBUG_MODE && result.details) {
      console.log(`   └─ Details: ${JSON.stringify(result.details)}`);
    }
  });

  console.log("-".repeat(50));
}

/**
 * メイン実行関数
 */
async function main() {
  console.log("🚀 MCP Proxy Server Connection Test Suite");
  console.log(`⚙️  Test Mode: ${TEST_MODE}`);
  console.log(`📍 Proxy URL: ${PROXY_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);

  if (INSTANCE_ID) {
    console.log(`🆔 Instance ID: ${INSTANCE_ID}`);
  }

  if (DEBUG_MODE) {
    console.log(`🔍 Debug Mode: ENABLED`);
  }

  console.log("");

  try {
    switch (TEST_MODE.toLowerCase()) {
      case "query":
      case "query-param":
        await testQueryParamAuth();
        break;
      case "instance-id":
        await testInstanceIdAuth();
        break;
      case "both":
      default:
        await testBothAuthMethods();
        break;
    }

    // 単一テストモードの場合もサマリーを表示
    if (TEST_MODE !== "both" && testResults.length > 0) {
      displaySummary();
    }

    const hasFailures = testResults.some((r) => !r.success);
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// メイン実行
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
