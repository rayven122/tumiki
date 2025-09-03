/**
 * MCP ProxyServer パフォーマンステスト
 * MCPプロトコル準拠の初期化とautocannonによる負荷テストを統合
 */

import autocannon from "autocannon";
import type { Instance, Result } from "autocannon";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const API_KEY = process.env.TEST_API_KEY || process.argv[2];
const TEST_NAME = process.argv[3] || "baseline";
const PROXY_URL = process.env.MCP_PROXY_URL || "http://localhost:8080";
const OUTPUT_DIR = path.join(__dirname, "..", "perf-results");

// APIキーチェック
if (!API_KEY) {
  console.error("❌ エラー: APIキーが設定されていません");
  console.error("使用方法:");
  console.error("  環境変数: TEST_API_KEY=your_key pnpm perf:baseline");
  console.error("  引数: pnpm perf your_key baseline");
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

type Tool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
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
};

/**
 * MCPプロトコル準拠の初期化フロー
 * 1. initialize リクエスト
 * 2. initialized 通知
 */
async function initializeMcpSession(): Promise<string | null> {
  const initUrl = `${PROXY_URL}/mcp?api-key=${API_KEY}`;

  try {
    console.log("🔐 MCPプロトコル初期化開始...");

    // 1. Initialize Request（初期化リクエスト）
    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    let initData: {
      result?: {
        serverInfo?: ServerInfo;
        sessionId?: string;
      };
    };

    if (contentType?.includes("text/event-stream")) {
      // SSE形式の場合はテキストとして読み込み、パースする
      const text = await initResponse.text();
      console.log("SSE形式のレスポンスを受信");
      // SSEメッセージから実際のJSONデータを抽出
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            initData = JSON.parse(line.substring(6)) as typeof initData;
            break;
          } catch (e) {
            // パースエラーは無視して次の行へ
          }
        }
      }
      if (!initData!) {
        console.warn("SSEレスポンスからJSONデータを抽出できませんでした");
        return null;
      }
    } else {
      // 通常のJSONレスポンス
      initData = (await initResponse.json()) as typeof initData;
    }

    console.log(
      `✅ Initialize成功: サーバー=${initData.result?.serverInfo?.name || "unknown"}`,
    );

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
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
        // 通知にはidを含めない
      }),
    });

    // 通知は通常レスポンスを返さないか、空のレスポンスを返す
    if (notifyResponse.ok || notifyResponse.status === 204) {
      console.log("✅ Initialized通知完了");
      if (sessionId) {
        console.log(`🔑 セッションID: ${sessionId}`);
      }
      return sessionId;
    }

    console.warn(
      `⚠️ Initialized通知で予期しないステータス: ${notifyResponse.status}`,
    );
    return sessionId; // セッションIDがあれば返す
  } catch (error) {
    console.error("❌ MCPセッション初期化エラー:", error);
  }

  return null;
}

/**
 * autocannonによる負荷テスト実行
 */
function runLoadTest(
  scenario: string,
  config: {
    connections: number;
    duration: number;
    sessionId?: string | null;
    title: string;
  },
): Promise<Result> {
  const testUrl = `${PROXY_URL}/mcp?api-key=${API_KEY}`;

  console.log(`\n🚀 ${config.title} 開始`);
  console.log(`📊 設定: ${config.connections}接続, ${config.duration}秒`);
  console.log(`🔗 URL: ${PROXY_URL}/mcp`);
  console.log(`🔑 API Key: ${API_KEY?.substring(0, 8)}***`);

  if (config.sessionId) {
    console.log(`🔑 セッションID: ${config.sessionId}`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "x-client-id": "perf-test-client",
  };

  // セッションIDがある場合はヘッダーに追加
  if (config.sessionId) {
    headers["mcp-session-id"] = config.sessionId;
  }

  return new Promise<Result>((resolve) => {
    const instance: Instance = autocannon(
      {
        url: testUrl,
        connections: config.connections,
        duration: config.duration,
        pipelining: 1,
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          params: {},
          id: 1,
        }),
        title: config.title,
        setupClient: (client) => {
          client.on("response", (statusCode: number) => {
            if (statusCode !== 200 && statusCode !== 201) {
              console.warn(`⚠️ 非成功ステータス: ${statusCode}`);
            }
          });
        },
      },
      (err, result) => {
        if (err) {
          console.error("テストエラー:", err);
          return;
        }

        // 結果の保存
        const timestamp = new Date().toISOString().replace(/:/g, "-");
        const filename = `${scenario}_${timestamp}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);

        fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
        console.log(`📁 結果を保存: ${filepath}`);

        // サマリー表示
        displaySummary(result);
        resolve(result);
      },
    );

    // プログレス表示
    autocannon.track(instance, { renderProgressBar: true });
  });
}

/**
 * 結果サマリー表示
 */
function displaySummary(result: Result): void {
  console.log("\n📊 === パフォーマンスサマリー ===");
  console.log(`⏱️  実行時間: ${result.duration}秒`);
  console.log(`📈 リクエスト総数: ${result.requests.total}`);
  console.log(
    `✅ 成功率: ${((1 - result.errors / result.requests.total) * 100).toFixed(2)}%`,
  );
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
 * 比較レポート生成
 */
function generateComparisonReport(results: Record<string, Result>): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 === シナリオ比較レポート ===");
  console.log("=".repeat(60));

  const comparison = Object.entries(results).map(([scenario, result]) => ({
    シナリオ: scenario,
    平均RPS: result.requests.average,
    "P50 (ms)": result.latency.p50,
    "P99 (ms)": result.latency.p99,
    成功率: `${((1 - result.errors / result.requests.total) * 100).toFixed(2)}%`,
    エラー数: result.errors,
  }));

  console.table(comparison);

  // CSV出力
  const csvPath = path.join(
    OUTPUT_DIR,
    `comparison_${new Date().toISOString().replace(/:/g, "-")}.csv`,
  );
  const csvContent = [
    "シナリオ,平均RPS,P50(ms),P99(ms),成功率(%),エラー数",
    ...comparison.map(
      (row) =>
        `${row.シナリオ},${row["平均RPS"]},${row["P50 (ms)"]},${row["P99 (ms)"]},${row["成功率"]},${row["エラー数"]}`,
    ),
  ].join("\n");

  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📄 CSV比較レポート: ${csvPath}`);
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
  };

  const useMcpSession = process.argv.includes("--with-session");

  console.log("🎯 MCP ProxyServer パフォーマンステスト");
  console.log("=".repeat(60));
  console.log(`📋 実行モード設定:`);
  console.log(`  シナリオ: ${TEST_NAME}`);
  console.log(`  MCPセッション: ${useMcpSession ? "有効" : "無効"}`);
  console.log(`  プロキシURL: ${PROXY_URL}`);

  // MCPセッション初期化（必要な場合）
  let sessionId: string | null = null;
  if (useMcpSession) {
    sessionId = await initializeMcpSession();
    if (!sessionId) {
      console.warn(
        "⚠️ セッションIDが取得できませんでしたが、テストを続行します",
      );
    }
  }

  if (TEST_NAME === "all") {
    // 全シナリオ実行
    const results: Record<string, Result> = {};

    for (const [name, config] of Object.entries(scenarios)) {
      if (name === "endurance") continue; // 耐久テストはスキップ

      results[name] = await runLoadTest(name, {
        ...config,
        sessionId,
      });

      // シナリオ間で5秒待機
      if (Object.keys(results).length < 3) {
        console.log("\n⏳ 次のシナリオまで5秒待機...\n");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    generateComparisonReport(results);
    console.log("\n🎉 パフォーマンステスト完了！");
  } else if (scenarios[TEST_NAME as keyof Scenarios]) {
    // 単一シナリオ実行
    const config = scenarios[TEST_NAME as keyof Scenarios];
    await runLoadTest(TEST_NAME, {
      ...config,
      sessionId,
    });
    console.log("\n✅ テスト完了");
  } else {
    console.error(`❌ エラー: 無効なテスト名 '${TEST_NAME}'`);
    console.error(`有効なテスト名: ${Object.keys(scenarios).join(", ")}, all`);
    process.exit(1);
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { initializeMcpSession, runLoadTest };
