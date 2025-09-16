/**
 * MCP ProxyServer パフォーマンステスト
 * MCPプロトコル準拠の初期化とautocannonによる負荷テストを統合
 */

import autocannon from "autocannon";
import type { Instance, Result, Options } from "autocannon";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Autocannon型定義の拡張
interface AutocannonClient {
  sessionId?: string;
  on: (event: "response", listener: (statusCode: number) => void) => void;
}

type AutocannonHeaders = Record<string, string | number>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const API_KEY = process.env.TEST_API_KEY;
const PROXY_URL = process.env.MCP_PROXY_URL || "http://localhost:8080";
const OUTPUT_DIR = path.join(__dirname, "..", "perf-results");

// APIキーチェック
if (!API_KEY) {
  console.error("❌ エラー: APIキーが設定されていません");
  console.error("使用方法:");
  console.error("  TEST_API_KEY=your_key pnpm perf:test");
  process.exit(1);
}

// 結果ディレクトリ作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 型定義
type ServerInfo = {
  name: string;
  version: string;
};

type ScenarioConfig = {
  connections: number;
  duration: number;
  title: string;
};

type Scenarios = {
  baseline: ScenarioConfig;
  stress: ScenarioConfig;
  spike: ScenarioConfig;
  endurance: ScenarioConfig;
  session: ScenarioConfig;
};

/**
 * MCPプロトコル準拠の初期化フロー
 * 1. initialize リクエスト
 * 2. initialized 通知
 */
async function initializeMcpSession(): Promise<string | null> {
  const initUrl = `${PROXY_URL}/mcp?api-key=${API_KEY}`;

  try {
    // 1. Initialize Request（初期化リクエスト）
    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Validation-Mode": "true",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          clientInfo: {
            name: "perf-test-client",
            version: "1.0.0",
          },
        },
      }),
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`❌ Initialize失敗: ${initResponse.status} - ${errorText}`);
      return null;
    }

    // Content-Typeをチェック
    const contentType = initResponse.headers.get("content-type");
    let initData:
      | {
          result?: {
            serverInfo?: ServerInfo;
            sessionId?: string;
          };
        }
      | undefined;

    if (contentType?.includes("text/event-stream")) {
      // SSE形式の場合はテキストとして読み込み、パースする
      const text = await initResponse.text();
      // SSEメッセージから実際のJSONデータを抽出
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            initData = JSON.parse(line.substring(6)) as typeof initData;
            break;
          } catch {
            // パースエラーは無視して次の行へ
          }
        }
      }
      if (!initData) {
        return null;
      }
    } else {
      // 通常のJSONレスポンス
      initData = (await initResponse.json()) as NonNullable<typeof initData>;
    }

    if (!initData) {
      console.error("❌ 初期化データの取得に失敗しました");
      return null;
    }

    // セッションIDを取得（ヘッダーまたはレスポンスから）
    const sessionId =
      initResponse.headers.get("mcp-session-id") ||
      initData.result?.sessionId ||
      null;

    // 2. Initialized Notification（初期化完了通知）
    const notifyResponse = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Validation-Mode": "true",
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
        // 通知にはidを含めない
      }),
    });

    // 通知は通常レスポンスを返さないか、空のレスポンスを返す
    if (!(notifyResponse.ok || notifyResponse.status === 204)) {
      console.warn(`⚠️ Initialized通知エラー: ${notifyResponse.status}`);
    }
    return sessionId; // セッションIDがあれば返す
  } catch (error) {
    console.error("❌ MCPセッション初期化エラー:", error);
  }

  return null;
}

/**
 * 詳細ログ記録用の型定義
 */
type ValidationLog = {
  timestamp: string;
  sessionId: string | null;
  isValid: boolean;
  toolCount: number;
  responseTime: number;
  errorMessage?: string;
  toolNames?: string[];
};

type SessionValidationSummary = {
  totalSessions: number;
  validSessions: number;
  toolValidationSuccess: number;
  toolValidationFailure: number;
  averageToolCount: number;
  averageResponseTime: number;
  logs: ValidationLog[];
};

/**
 * tools/list レスポンスを検証する（詳細ログ機能付き）
 */
async function validateToolsListResponse(
  sessionId: string | null = null,
): Promise<{
  isValid: boolean;
  toolCount: number;
  errorMessage?: string;
  log: ValidationLog;
}> {
  const testUrl = `${PROXY_URL}/mcp?api-key=${API_KEY}`;
  const startTime = performance.now();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Validation-Mode": "true",
    };

    if (sessionId) {
      headers["mcp-session-id"] = sessionId;
    }

    const response = await fetch(testUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1,
      }),
    });

    const responseTime = performance.now() - startTime;

    if (!response.ok) {
      const log: ValidationLog = {
        timestamp: new Date().toISOString(),
        sessionId,
        isValid: false,
        toolCount: 0,
        responseTime,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };

      return {
        isValid: false,
        toolCount: 0,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        log,
      };
    }

    // Content-Typeをチェックしてレスポンスを適切にパース
    const contentType = response.headers.get("content-type");

    type ResponseData = {
      error?: { code: number; message: string };
      result?: { tools?: Array<{ name: string; description: string }> };
    };

    let responseData: ResponseData;

    if (contentType?.includes("text/event-stream")) {
      // SSE形式の場合はテキストとして読み込み、パースする
      const text = await response.text();
      // SSEメッセージから実際のJSONデータを抽出
      const lines = text.split("\n");
      let parsedData: ResponseData | null = null;

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            parsedData = JSON.parse(line.substring(6)) as ResponseData;
            break;
          } catch {
            // パースエラーは無視して次の行へ
            continue;
          }
        }
      }

      if (!parsedData) {
        const errorMessage = "No valid JSON data found in SSE response";
        const log: ValidationLog = {
          timestamp: new Date().toISOString(),
          sessionId,
          isValid: false,
          toolCount: 0,
          responseTime,
          errorMessage,
        };

        return {
          isValid: false,
          toolCount: 0,
          errorMessage,
          log,
        };
      }

      responseData = parsedData;
    } else {
      // 通常のJSONレスポンス
      responseData = (await response.json()) as ResponseData;
    }

    // JSON-RPC エラーチェック
    if (responseData.error) {
      const errorMessage = `JSON-RPC Error ${responseData.error.code}: ${responseData.error.message}`;
      const log: ValidationLog = {
        timestamp: new Date().toISOString(),
        sessionId,
        isValid: false,
        toolCount: 0,
        responseTime,
        errorMessage,
      };

      return {
        isValid: false,
        toolCount: 0,
        errorMessage,
        log,
      };
    }

    // tools/list の結果検証
    if (!responseData.result || !responseData.result.tools) {
      const errorMessage = "Missing 'result.tools' in response";
      const log: ValidationLog = {
        timestamp: new Date().toISOString(),
        sessionId,
        isValid: false,
        toolCount: 0,
        responseTime,
        errorMessage,
      };

      return {
        isValid: false,
        toolCount: 0,
        errorMessage,
        log,
      };
    }

    const tools = responseData.result.tools;
    if (!Array.isArray(tools)) {
      const errorMessage = "tools is not an array";
      const log: ValidationLog = {
        timestamp: new Date().toISOString(),
        sessionId,
        isValid: false,
        toolCount: 0,
        responseTime,
        errorMessage,
      };

      return {
        isValid: false,
        toolCount: 0,
        errorMessage,
        log,
      };
    }

    // ツールの妥当性チェック
    const toolNames: string[] = [];
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      if (!tool || !tool.name || !tool.description) {
        const errorMessage = `Tool at index ${i} missing name or description`;
        const log: ValidationLog = {
          timestamp: new Date().toISOString(),
          sessionId,
          isValid: false,
          toolCount: tools.length,
          responseTime,
          errorMessage,
          toolNames: toolNames,
        };

        return {
          isValid: false,
          toolCount: tools.length,
          errorMessage,
          log,
        };
      }
      toolNames.push(tool.name);
    }

    const log: ValidationLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      isValid: true,
      toolCount: tools.length,
      responseTime,
      toolNames,
    };

    return {
      isValid: true,
      toolCount: tools.length,
      log,
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    const errorMessage = `Network error: ${String(error)}`;
    const log: ValidationLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      isValid: false,
      toolCount: 0,
      responseTime,
      errorMessage,
    };

    return {
      isValid: false,
      toolCount: 0,
      errorMessage,
      log,
    };
  }
}

/**
 * 共通セッションプールの作成（詳細ログ機能付き）
 */
async function createSessionPool(
  connections: number,
): Promise<{ sessions: string[]; summary: SessionValidationSummary }> {
  const sessions: string[] = [];
  const validationLogs: ValidationLog[] = [];
  let validToolsResponses = 0;
  let totalResponseTime = 0;
  let totalToolCount = 0;

  for (let i = 0; i < connections; i++) {
    try {
      const sessionId = await initializeMcpSession();
      sessions.push(sessionId || "");

      // セッションが正常に作成された場合、tools/listをテスト
      if (sessionId) {
        const validation = await validateToolsListResponse(sessionId);
        validationLogs.push(validation.log);

        totalResponseTime += validation.log.responseTime;

        if (validation.isValid) {
          validToolsResponses++;
          totalToolCount += validation.toolCount;

          // 詳細ログ出力
          console.log(
            `✅ セッション${i + 1}: ツール${validation.toolCount}件取得成功 (${validation.log.responseTime.toFixed(2)}ms)`,
          );
          if (validation.log.toolNames && validation.log.toolNames.length > 0) {
            const displayLimit = 3;
            const toolDisplay =
              validation.toolCount >= displayLimit
                ? `${validation.log.toolNames.slice(0, displayLimit).join(", ")}...`
                : validation.log.toolNames.join(", ");
            console.log(`   📋 取得ツール: ${toolDisplay}`);
          }
        } else {
          console.error(
            `❌ セッション${i + 1}: ツール取得失敗 (${validation.log.responseTime.toFixed(2)}ms)`,
          );
          console.error(`   🔍 エラー: ${validation.errorMessage}`);
        }
      } else {
        // セッションIDが取得できない場合のログ
        const errorLog: ValidationLog = {
          timestamp: new Date().toISOString(),
          sessionId: null,
          isValid: false,
          toolCount: 0,
          responseTime: 0,
          errorMessage: "Session initialization failed",
        };
        validationLogs.push(errorLog);
      }
    } catch (error) {
      console.error(`❌ セッション${i + 1}: 初期化エラー - ${String(error)}`);
      sessions.push("");

      // エラーログ
      const errorLog: ValidationLog = {
        timestamp: new Date().toISOString(),
        sessionId: null,
        isValid: false,
        toolCount: 0,
        responseTime: 0,
        errorMessage: `Session initialization exception: ${String(error)}`,
      };
      validationLogs.push(errorLog);
    }
  }

  const validSessions = sessions.filter((s) => s).length;
  const averageResponseTime =
    validationLogs.length > 0 ? totalResponseTime / validationLogs.length : 0;
  const averageToolCount =
    validToolsResponses > 0 ? totalToolCount / validToolsResponses : 0;

  // サマリーレポート生成
  const summary: SessionValidationSummary = {
    totalSessions: connections,
    validSessions,
    toolValidationSuccess: validToolsResponses,
    toolValidationFailure: validSessions - validToolsResponses,
    averageToolCount,
    averageResponseTime,
    logs: validationLogs,
  };

  // 詳細レポート出力
  console.log(`🎆 セッションプール: ${validSessions}/${connections}件成功`);
  console.log(`🔧 ツール取得: ${validToolsResponses}/${validSessions}件成功`);
  console.log(`📊 平均レスポンス時間: ${averageResponseTime.toFixed(2)}ms`);
  console.log(`🔧 平均ツール数: ${averageToolCount.toFixed(1)}件`);

  if (validToolsResponses === 0) {
    console.error(`🚨 警告: すべてのセッションでツール取得に失敗しました`);

    // 失敗原因の分析
    const errorCounts = new Map<string, number>();
    validationLogs
      .filter((log) => !log.isValid && log.errorMessage)
      .forEach((log) => {
        const errorKey = log.errorMessage?.split(":")[0] ?? "Unknown"; // エラーの種類を抽出
        errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
      });

    console.error(`🔍 エラー分析:`);
    for (const [error, count] of errorCounts.entries()) {
      console.error(`   ${error}: ${count}件`);
    }
  }

  return { sessions, summary };
}

/**
 * autocannonによる負荷テスト実行
 */
async function runLoadTest(
  scenario: string,
  config: {
    connections: number;
    duration: number;
    title: string;
  },
): Promise<{ result: Result; summary: SessionValidationSummary }> {
  const testUrl = `${PROXY_URL}/mcp?api-key=${API_KEY}`;

  console.log(`\n🚀 ${config.title} 開始`);
  console.log(`📊 設定: ${config.connections}接続, ${config.duration}秒`);
  console.log(`🔗 URL: ${PROXY_URL}/mcp`);
  console.log(`🔑 API Key: ${API_KEY?.substring(0, 8)}***`);

  // セッションプールを事前作成
  const sessionPoolResult = await createSessionPool(config.connections);
  const { sessions, summary } = sessionPoolResult;
  let currentSessionIndex = 0;

  // Headers will be set dynamically in the headers function

  return new Promise<{ result: Result; summary: SessionValidationSummary }>(
    (resolve) => {
      const instance: Instance = autocannon(
        {
          url: testUrl,
          connections: config.connections,
          duration: config.duration,
          pipelining: 1,
          method: "POST",
          title: config.title,
          setupClient: (client: AutocannonClient) => {
            // 各クライアントに順次セッションIDを割り当て
            const sessionId = sessions[currentSessionIndex % sessions.length];
            currentSessionIndex++;

            // クライアントにセッションIDを保存
            client.sessionId = sessionId;

            client.on("response", (statusCode: number) => {
              // 2xx以外のステータスコードのみログ出力（415は誤検出のため除外）
              if (
                statusCode !== 200 &&
                statusCode !== 201 &&
                statusCode !== 415
              ) {
                console.warn(`⚠️ 非成功ステータス: ${statusCode}`);
              }
            });
          },
          headers: (client: AutocannonClient): AutocannonHeaders => {
            const { sessionId } = client;

            // 明示的にContent-Typeを最初に設定
            const finalHeaders: AutocannonHeaders = {
              "Content-Type": "application/json",
              Accept: "application/json",
              "X-Validation-Mode": "true",
            };

            // セッションIDがある場合のみ追加
            if (sessionId) {
              finalHeaders["mcp-session-id"] = sessionId;
            }

            // デバッグ: Content-Type確認（簡素化）
            if (!finalHeaders["Content-Type"]) {
              console.error(
                "❌ [ERROR] Content-Type missing in autocannon headers!",
              );
            }

            return finalHeaders;
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 1,
          }),
        } as unknown as Options,
        (err, result) => {
          if (err) {
            console.error("テストエラー:", err);
            return;
          }

          // 拡張結果の保存（検証サマリー含む）
          saveEnhancedResults(result, summary, scenario);

          // 従来の結果保存も実行（後方互換性）
          const timestamp = new Date().toISOString().replace(/:/g, "-");
          const filename = `${scenario}_${timestamp}.json`;
          const filepath = path.join(OUTPUT_DIR, filename);

          fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
          console.log(`📁 結果を保存: ${filepath}`);

          // サマリー表示
          displaySummary(result);
          resolve({ result, summary });
        },
      );

      // プログレス表示
      autocannon.track(instance, { renderProgressBar: true });
    },
  );
}

/**
 * 結果サマリー表示
 */
function displaySummary(result: Result): void {
  console.log("\n📊 === パフォーマンスサマリー ===");
  console.log(`⏱️  実行時間: ${result.duration}秒`);

  // 成功率 = (送信総数 - エラー数) / 送信総数 * 100
  // autocannonのrequests.sentが送信総数、errorsがエラー数
  const totalSent = result.requests.sent || result.requests.total;
  const successRate = (((totalSent - result.errors) / totalSent) * 100).toFixed(
    2,
  );

  console.log(`📈 送信リクエスト数: ${totalSent}`);
  console.log(`✅ 成功リクエスト数: ${result.requests.total}`);
  console.log(`✅ 成功率: ${successRate}%`);
  console.log(`🔥 平均RPS: ${result.requests.average} req/sec`);

  console.log("\n⏱️  レイテンシ (ms):");
  console.log(`  P50: ${result.latency.p50}ms`);
  console.log(`  P90: ${result.latency.p90}ms`);
  console.log(`  P99: ${result.latency.p99}ms`);
  console.log(`  最大: ${result.latency.max}ms`);

  console.log("\n📦 スループット:");
  console.log(
    `  平均: ${(result.throughput.average / 1024).toFixed(2)} KB/sec`,
  );
  console.log(`  最大: ${(result.throughput.max / 1024).toFixed(2)} KB/sec`);

  if (result.errors > 0) {
    console.log(`\n❌ エラー: ${result.errors}件`);
  }
}

/**
 * パフォーマンスメトリクスを追加して保存
 */
function saveEnhancedResults(
  result: Result,
  summary: SessionValidationSummary,
  scenario: string,
): void {
  const timestamp = new Date().toISOString().replace(/:/g, "-");

  // オリジナルの結果に検証サマリーを追加
  const enhancedResult = {
    ...result,
    sessionValidation: {
      totalSessions: summary.totalSessions,
      validSessions: summary.validSessions,
      toolValidationSuccessRate:
        summary.toolValidationSuccess / summary.validSessions,
      toolValidationFailureRate:
        summary.toolValidationFailure / summary.validSessions,
      averageToolCount: summary.averageToolCount,
      averageToolResponseTime: summary.averageResponseTime,
      toolValidationSuccess: summary.toolValidationSuccess,
      toolValidationFailure: summary.toolValidationFailure,
    },
    performanceMetrics: {
      // 既存のautocannon結果に加えてカスタムメトリクスを追加
      rpsEfficiency: result.requests.average / summary.validSessions, // 有効セッション当たりのRPS
      avgLatencyPerTool: result.latency.average / summary.averageToolCount, // ツール当たり平均レイテンシ
      toolRetrievalSuccess: summary.toolValidationSuccess,
      toolRetrievalFailure: summary.toolValidationFailure,
      sessionEfficiency: summary.validSessions / summary.totalSessions, // セッション成功率
    },
  };

  // 詳細結果をJSONファイルに保存
  const filename = `${scenario}_enhanced_${timestamp}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(enhancedResult, null, 2));
  console.log(`📊 拡張結果を保存: ${filepath}`);
}

/**
 * 統一JSONレポート形式で保存
 */
function saveUnifiedJsonReport(
  results: Record<string, Result>,
  summaries: Record<string, SessionValidationSummary>,
) {
  const timestamp = new Date().toISOString().replace(/:/g, "-");

  // 統一レポート構造
  const unifiedReport = {
    reportInfo: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      apiKey: API_KEY?.substring(0, 8) + "***",
      proxyUrl: PROXY_URL,
    },
    scenarios: Object.entries(results).map(([scenario, result]) => {
      const summary = summaries[scenario];
      const totalSent = result.requests.sent || result.requests.total;
      const successRate = ((totalSent - result.errors) / totalSent) * 100;

      // シナリオ名を抽出（_httpサフィックスを削除）
      const scenarioName = scenario.replace("_http", "");

      return {
        name: scenarioName,
        transport: "HTTP",
        scenario: scenario,
        performance: {
          duration: result.duration,
          connections: result.connections,
          requests: {
            total: result.requests.total,
            sent: totalSent,
            average: result.requests.average,
            max: result.requests.max,
            min: result.requests.min,
          },
          latency: {
            average: result.latency.average,
            p50: result.latency.p50,
            p90: result.latency.p90,
            p99: result.latency.p99,
            max: result.latency.max,
            min: result.latency.min,
          },
          throughput: {
            average: result.throughput.average,
            max: result.throughput.max,
            min: result.throughput.min,
          },
          errors: result.errors,
          successRate: Number(successRate.toFixed(2)),
        },
        sessionValidation: summary
          ? {
              totalSessions: summary.totalSessions,
              validSessions: summary.validSessions,
              toolValidationSuccess: summary.toolValidationSuccess,
              toolValidationFailure: summary.toolValidationFailure,
              averageToolCount: summary.averageToolCount,
              averageResponseTime: summary.averageResponseTime,
              successRate: Number(
                (
                  (summary.toolValidationSuccess / summary.validSessions) *
                  100
                ).toFixed(2),
              ),
            }
          : null,
      };
    }),
    summary: {
      totalScenarios: Object.keys(results).length,
      averageRPS: Number(
        (
          Object.entries(results).reduce(
            (sum, [, result]) => sum + result.requests.average,
            0,
          ) / Object.entries(results).length
        ).toFixed(2),
      ),
      averageLatency: Number(
        (
          Object.entries(results).reduce(
            (sum, [, result]) => sum + result.latency.average,
            0,
          ) / Object.entries(results).length
        ).toFixed(2),
      ),
    },
  };

  // 統一JSONレポートを保存
  const filename = `performance_report_${timestamp}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(unifiedReport, null, 2));
  console.log(`📄 統一JSONレポートを保存: ${filepath}`);

  return unifiedReport;
}

/**
 * 比較レポート生成
 */
function generateComparisonReport(
  results: Record<string, Result>,
  summaries: Record<string, SessionValidationSummary> = {},
): void {
  console.log("\n" + "=".repeat(80));
  console.log("📊 === 詳細パフォーマンス比較レポート ===");
  console.log("=".repeat(80));

  const comparison = Object.entries(results).map(([scenario, result]) => {
    const totalSent = result.requests.sent || result.requests.total;
    const successRate = (
      ((totalSent - result.errors) / totalSent) *
      100
    ).toFixed(2);

    // シナリオ名を抽出（_httpサフィックスを削除）
    const scenarioName = scenario.replace("_http", "");

    return {
      シナリオ: scenarioName,
      Transport: "HTTP",
      平均RPS: Number(result.requests.average.toFixed(2)),
      最大RPS: result.requests.max,
      "P50 (ms)": result.latency.p50,
      "P90 (ms)": result.latency.p90,
      "P99 (ms)": result.latency.p99,
      "平均レイテンシ (ms)": Number(result.latency.average.toFixed(2)),
      成功率: `${successRate}%`,
      総送信数: totalSent,
      エラー数: result.errors,
      実行時間: `${result.duration}s`,
      "スループット (KB/s)": Number(
        (result.throughput.average / 1024).toFixed(2),
      ),
      接続数: result.connections || "N/A",
    };
  });

  console.table(comparison);

  // 統計サマリーを追加
  console.log("\n📈 === パフォーマンス統計サマリー ===");

  const httpResults = comparison.filter((r) => r.Transport === "HTTP");

  if (httpResults.length > 0) {
    const httpAvgRPS =
      httpResults.reduce((sum, r) => sum + r.平均RPS, 0) / httpResults.length;
    const httpAvgLatency =
      httpResults.reduce((sum, r) => sum + r["平均レイテンシ (ms)"], 0) /
      httpResults.length;

    console.log(
      `🟢 HTTP Transport - 平均RPS: ${httpAvgRPS.toFixed(2)}, 平均レイテンシ: ${httpAvgLatency.toFixed(2)}ms`,
    );
    console.log(
      `📊 全${httpResults.length}シナリオでのHTTP Transportパフォーマンス`,
    );
  }

  // エラー分析
  const totalErrors = comparison.reduce((sum, r) => sum + r.エラー数, 0);
  if (totalErrors > 0) {
    console.log(`\n⚠️  総エラー数: ${totalErrors}件`);
    const errorScenarios = comparison.filter((r) => r.エラー数 > 0);
    errorScenarios.forEach((r) => {
      console.log(
        `   ${r.シナリオ} (${r.Transport}): ${r.エラー数}件 - 成功率: ${r.成功率}`,
      );
    });
  } else {
    console.log(`\n✅ 全シナリオでエラー0件 - 完全成功!`);
  }

  // 統一JSONレポートを生成
  saveUnifiedJsonReport(results, summaries);
}

/**
 * メイン実行
 */
async function main() {
  const scenarios: Scenarios = {
    baseline: { connections: 10, duration: 10, title: "ベースライン" },
    stress: { connections: 50, duration: 30, title: "ストレステスト" },
    spike: { connections: 100, duration: 5, title: "スパイクテスト" },
    endurance: { connections: 20, duration: 60, title: "耐久テスト" },
    session: { connections: 10, duration: 10, title: "セッション再利用テスト" },
  };

  console.log("🎯 MCP ProxyServer パフォーマンステスト");
  console.log("=".repeat(60));
  console.log(`📋 設定:`);
  console.log(`  全シナリオ実行: ${Object.keys(scenarios).join(", ")}`);
  console.log(`  プロキシURL: ${PROXY_URL}`);
  console.log("");

  // HTTP Transportでテストを実行
  console.log("🔄 HTTP Transportでテスト実行:");
  console.log("  Streamable HTTP Transport (HTTP初期化)");
  console.log("");

  // HTTP Transport テスト実行
  const transportResults: Record<string, Result> = {};
  const transportSummaries: Record<string, SessionValidationSummary> = {};

  console.log("🌐 HTTP Transport テスト開始...");
  console.log("✅ HTTP Transport使用、各接続で個別セッション作成");

  // 全シナリオを実行
  for (const [name, config] of Object.entries(scenarios)) {
    const { result, summary } = await runLoadTest(`${name}_http`, {
      ...config,
    });
    transportResults[`${name}_http`] = result;
    transportSummaries[`${name}_http`] = summary;
  }

  // 結果レポート生成
  generateComparisonReport(transportResults, transportSummaries);
  console.log("\n🎉 全シナリオ パフォーマンステスト完了！");
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { initializeMcpSession, runLoadTest };
