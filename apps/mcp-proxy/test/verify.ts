/**
 * MCP Proxy検証スクリプト
 *
 * このスクリプトは、mcp-proxyのAPI Key認証を使用した
 * 各種MCPプロトコル操作の動作確認を自動で実行します。
 *
 * 実行方法:
 * 1. テストデータが投入されていること（pnpm test:seed）
 * 2. mcp-proxyが起動していること（別ターミナルで pnpm dev）
 * 3. このスクリプトを実行: pnpm test:verify
 */

const TEST_API_KEY = "test-api-key-12345-verification";
const TEST_MCP_SERVER_ID = "mcp_server_verification";
const PROXY_URL = process.env.PROXY_URL ?? "http://localhost:8080";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

/**
 * JSON-RPC リクエストを送信
 */
/**
 * SSEレスポンスをパース
 */
const parseSSEResponse = (sseText: string): JsonRpcResponse | null => {
  const lines = sseText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        return JSON.parse(data) as JsonRpcResponse;
      } catch {
        continue;
      }
    }
  }
  return null;
};

const sendRequest = async (
  request: JsonRpcRequest,
  useApiKey = true,
): Promise<JsonRpcResponse> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (useApiKey) {
    headers["X-API-Key"] = TEST_API_KEY;
  }

  const response = await fetch(`${PROXY_URL}/mcp/${TEST_MCP_SERVER_ID}`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  // SSE形式の場合
  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    const parsed = parseSSEResponse(text);
    if (!parsed) {
      throw new Error("Failed to parse SSE response");
    }
    return parsed;
  }

  // JSON形式の場合
  return (await response.json()) as JsonRpcResponse;
};

/**
 * テスト結果を表示
 */
const printResult = (
  testName: string,
  success: boolean,
  message?: string,
  responseTime?: number,
) => {
  const icon = success ? "✅" : "❌";
  const timeInfo = responseTime ? ` (${responseTime}ms)` : "";
  console.log(`${icon} ${testName}${timeInfo}`);
  if (message) {
    console.log(`   ${message}`);
  }
};

/**
 * メイン検証処理
 */
const main = async () => {
  console.log("🚀 MCP Proxy検証を開始します...\n");
  console.log(`検証対象: ${PROXY_URL}/mcp/${TEST_MCP_SERVER_ID}`);
  console.log(`APIキー: ${TEST_API_KEY}\n`);

  let totalTests = 0;
  let passedTests = 0;

  // テスト1: API Key認証（X-API-Keyヘッダー）
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("テスト1: API Key認証（X-API-Keyヘッダー）");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  totalTests++;

  try {
    const startTime = Date.now();
    const response = await sendRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: "verification-script",
          version: "1.0.0",
        },
      },
    });
    const responseTime = Date.now() - startTime;

    if (response.result) {
      passedTests++;
      printResult("API Key認証（X-API-Key）", true, "認証成功", responseTime);
    } else {
      printResult(
        "API Key認証（X-API-Key）",
        false,
        `エラー: ${response.error?.message}`,
        responseTime,
      );
    }
  } catch (error) {
    printResult(
      "API Key認証（X-API-Key）",
      false,
      `例外: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  console.log();

  // テスト2: 無効なAPIキーでのアクセス（エラー確認）
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("テスト2: 無効なAPIキーでのアクセス");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  totalTests++;

  try {
    const startTime = Date.now();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": "invalid-api-key-12345",
    };

    const response = await fetch(`${PROXY_URL}/mcp/${TEST_MCP_SERVER_ID}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "initialize",
        params: {},
      }),
    });

    const result = (await response.json()) as JsonRpcResponse;
    const responseTime = Date.now() - startTime;

    if (result.error && result.error.code === -32001) {
      passedTests++;
      printResult(
        "無効なAPIキーの拒否",
        true,
        "期待通りエラーが返却されました",
        responseTime,
      );
    } else {
      printResult(
        "無効なAPIキーの拒否",
        false,
        "無効なAPIキーが受け入れられてしまいました",
        responseTime,
      );
    }
  } catch (error) {
    printResult(
      "無効なAPIキーの拒否",
      false,
      `例外: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  console.log();

  // テスト3: ツールリストの取得
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("テスト3: ツールリストの取得");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  totalTests++;

  try {
    const startTime = Date.now();
    const response = await sendRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
      params: {},
    });
    const responseTime = Date.now() - startTime;

    if (
      response.result &&
      typeof response.result === "object" &&
      "tools" in response.result &&
      Array.isArray(response.result.tools)
    ) {
      const tools = response.result.tools as Array<{ name: string }>;
      if (tools.length > 0) {
        passedTests++;
        printResult(
          "ツールリストの取得",
          true,
          `${tools.length}個のツールを取得: ${tools.map((t) => t.name).join(", ")}`,
          responseTime,
        );
      } else {
        printResult(
          "ツールリストの取得",
          false,
          "ツールが0個でした",
          responseTime,
        );
      }
    } else {
      printResult(
        "ツールリストの取得",
        false,
        `エラー: ${response.error?.message}`,
        responseTime,
      );
    }
  } catch (error) {
    printResult(
      "ツールリストの取得",
      false,
      `例外: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  console.log();

  // テスト4: ツールの実行（Context7__resolve-library-id）
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("テスト4: ツールの実行（Context7__resolve-library-id）");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  totalTests++;

  try {
    const startTime = Date.now();
    const response = await sendRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "Context7__resolve-library-id",
        arguments: {
          libraryName: "react",
        },
      },
    });
    const responseTime = Date.now() - startTime;

    if (response.result) {
      passedTests++;
      printResult(
        "ツールの実行",
        true,
        "Context7__resolve-library-idの実行に成功",
        responseTime,
      );
    } else {
      printResult(
        "ツールの実行",
        false,
        `エラー: ${response.error?.message}`,
        responseTime,
      );
    }
  } catch (error) {
    printResult(
      "ツールの実行",
      false,
      `例外: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  console.log();

  // 結果サマリー
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("検証結果サマリー");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`総テスト数: ${totalTests}`);
  console.log(`成功: ${passedTests}`);
  console.log(`失敗: ${totalTests - passedTests}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (passedTests === totalTests) {
    console.log("✅ すべてのテストが成功しました！");
    process.exit(0);
  } else {
    console.log("❌ いくつかのテストが失敗しました。");
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("❌ 検証中に予期しないエラーが発生しました:", error);
  process.exit(1);
});
