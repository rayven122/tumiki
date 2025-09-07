#!/usr/bin/env node

/**
 * パフォーマンスダッシュボード用簡易HTTPサーバー
 * perf-resultsディレクトリの全JSONファイルを自動検索・提供
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// 型定義
interface FileMetadata {
  filename: string;
  path: string;
  size: number;
  modified: string;
  created: string;
}

// パフォーマンスレポートデータ型定義
interface PerformanceReportData {
  latency?: {
    average?: number;
    p50?: number;
    p90?: number;
    p99?: number;
    max?: number;
    min?: number;
    stddev?: number;
  };
  requests?: {
    total?: number;
    average?: number;
    max?: number;
    min?: number;
  };
  errors?: number;
  duration?: number;
  sessionValidation?: {
    validSessions?: number;
    toolValidationSuccess?: number;
    averageToolCount?: number;
  };
}

// シナリオ別メトリクス型定義
interface ScenarioMetrics {
  scenarioType: "baseline" | "stress" | "spike" | "endurance" | "session";
  keyMetrics: Record<string, number>;
  insights: string[];
  recommendations: string[];
  thresholds: {
    warning: Record<string, number>;
    critical: Record<string, number>;
  };
}

interface ScenarioAnalysis {
  baseline: ScenarioMetrics;
  stress: ScenarioMetrics;
  spike: ScenarioMetrics;
  endurance: ScenarioMetrics;
  session: ScenarioMetrics;
}

const PORT = Number(process.env.DASHBOARD_PORT) || 3100;
const HOST = "localhost";

// プロジェクトのperf-resultsディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PERF_RESULTS_DIR = join(__dirname, "..", "perf-results");

console.log(`📊 パフォーマンスダッシュボードサーバー`);
console.log(`📁 監視ディレクトリ: ${PERF_RESULTS_DIR}`);

/**
 * MIME typeを取得
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon",
  } as const;
  return mimeTypes[ext as keyof typeof mimeTypes] || "application/octet-stream";
}

/**
 * perf-resultsディレクトリからJSONファイル一覧を取得
 */
function getPerformanceReports(): FileMetadata[] {
  try {
    if (!existsSync(PERF_RESULTS_DIR)) {
      console.warn(`⚠️  ディレクトリが存在しません: ${PERF_RESULTS_DIR}`);
      return [];
    }

    const files = readdirSync(PERF_RESULTS_DIR);
    const jsonFiles = files
      .filter(
        (file) =>
          file.endsWith(".json") &&
          (file.includes("performance_report_") || file.includes("_enhanced_")),
      )
      .map((file) => {
        const filePath = join(PERF_RESULTS_DIR, file);
        const stats = statSync(filePath);

        return {
          filename: file,
          path: `/reports/${file}`,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime(),
      ); // 最新順

    console.log(`📄 JSONファイル検出: ${jsonFiles.length}件`);
    return jsonFiles;
  } catch (error) {
    console.error("❌ ファイル一覧取得エラー:", error);
    return [];
  }
}

/**
 * JSONレポートファイルの内容を取得
 */
function getReportContent(filename: string): unknown {
  try {
    const filePath = join(PERF_RESULTS_DIR, filename);
    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ ファイル読み込みエラー (${filename}):`, error);
    return null;
  }
}

/**
 * シナリオ別メトリクス計算
 */
function calculateScenarioMetrics(
  scenarioType: string,
  reportData: PerformanceReportData | null,
): ScenarioMetrics {
  const metrics: ScenarioMetrics = {
    scenarioType: scenarioType as ScenarioMetrics["scenarioType"],
    keyMetrics: {},
    insights: [],
    recommendations: [],
    thresholds: {
      warning: {},
      critical: {},
    },
  };

  if (!reportData) return metrics;

  const latency = reportData?.latency || {};
  const requests = reportData?.requests || {};
  const errors = reportData?.errors || 0;
  const duration = reportData?.duration || 1;
  const sessionValidation = reportData?.sessionValidation || {};

  // 共通メトリクス
  metrics.keyMetrics.averageLatency = latency.average || 0;
  metrics.keyMetrics.p50Latency = latency.p50 || 0;
  metrics.keyMetrics.p90Latency = latency.p90 || 0;
  metrics.keyMetrics.p99Latency = latency.p99 || 0;
  metrics.keyMetrics.averageRPS = requests.average || 0;
  metrics.keyMetrics.maxRPS = requests.max || 0;
  metrics.keyMetrics.errorRate = (errors / (requests.total || 1)) * 100;
  metrics.keyMetrics.successRate = 100 - metrics.keyMetrics.errorRate;

  // シナリオ固有の分析
  switch (scenarioType) {
    case "baseline":
      metrics.keyMetrics.stabilityScore = Math.max(
        0,
        100 - (latency.stddev || 0) / 10,
      );
      metrics.thresholds.warning = { averageLatency: 500, errorRate: 1 };
      metrics.thresholds.critical = { averageLatency: 1000, errorRate: 5 };

      const avgLatency = metrics.keyMetrics.averageLatency ?? 0;
      if (avgLatency < 300) {
        metrics.insights.push("🟢 レスポンス時間が良好");
      } else if (avgLatency > 500) {
        metrics.insights.push("🟡 レスポンス時間が基準値を超過");
      }

      metrics.recommendations.push(
        "このベースライン値を他のシナリオとの比較基準として使用",
      );
      break;

    case "stress":
      metrics.keyMetrics.degradationFactor =
        (metrics.keyMetrics.averageLatency ?? 0) / (latency.min || 1);
      metrics.keyMetrics.maxThroughput = requests.max || 0;
      metrics.thresholds.warning = { averageLatency: 1000, errorRate: 10 };
      metrics.thresholds.critical = { averageLatency: 3000, errorRate: 25 };

      if (metrics.keyMetrics.errorRate > 10) {
        metrics.insights.push("🔴 高負荷時のエラー率が高い");
        metrics.recommendations.push("サーバーリソースの増強を検討");
      } else if (metrics.keyMetrics.errorRate < 5) {
        metrics.insights.push("🟢 高負荷に対する耐性が良好");
      }
      break;

    case "spike":
      metrics.keyMetrics.recoveryTime = (latency.max || 0) - (latency.min || 0);
      metrics.keyMetrics.spikeTolerance = Math.max(
        0,
        100 - metrics.keyMetrics.errorRate * 2,
      );
      metrics.thresholds.warning = { recoveryTime: 1000, errorRate: 15 };
      metrics.thresholds.critical = { recoveryTime: 3000, errorRate: 30 };

      if (metrics.keyMetrics.recoveryTime > 2000) {
        metrics.insights.push("🟡 スパイク負荷からの回復時間が長い");
        metrics.recommendations.push("オートスケーリング設定の最適化");
      }
      break;

    case "endurance":
      metrics.keyMetrics.stabilityTrend =
        100 -
        (Math.abs((latency.max || 0) - (latency.min || 0)) /
          (latency.average || 1)) *
          10;
      metrics.keyMetrics.resourceEfficiency = (requests.total || 0) / duration;
      metrics.thresholds.warning = { stabilityTrend: 80, errorRate: 3 };
      metrics.thresholds.critical = { stabilityTrend: 60, errorRate: 8 };

      if (duration > 30 && metrics.keyMetrics.errorRate < 2) {
        metrics.insights.push("🟢 長時間運用での安定性が良好");
      } else if (metrics.keyMetrics.errorRate > 5) {
        metrics.insights.push("🔴 長時間運用でエラーが増加");
        metrics.recommendations.push("メモリリーク検査とリソース監視強化");
      }
      break;

    case "session":
      metrics.keyMetrics.sessionReuseRate =
        sessionValidation.validSessions || 0;
      metrics.keyMetrics.sessionEfficiency =
        ((sessionValidation.toolValidationSuccess || 0) /
          Math.max(1, sessionValidation.validSessions || 1)) *
        100;
      metrics.keyMetrics.averageToolCount =
        sessionValidation.averageToolCount || 0;
      metrics.thresholds.warning = {
        sessionReuseRate: 80,
        sessionEfficiency: 85,
      };
      metrics.thresholds.critical = {
        sessionReuseRate: 60,
        sessionEfficiency: 70,
      };

      if (metrics.keyMetrics.sessionEfficiency > 90) {
        metrics.insights.push("🟢 セッション管理効率が非常に良好");
      } else if (metrics.keyMetrics.sessionEfficiency < 80) {
        metrics.insights.push("🟡 セッション管理効率に改善の余地");
        metrics.recommendations.push("セッションプール設定の調整");
      }
      break;
  }

  return metrics;
}

/**
 * 全シナリオのメトリクス分析を実行
 */
function analyzeAllScenarios(): ScenarioAnalysis {
  const reports = getPerformanceReports();
  const analysis: Partial<ScenarioAnalysis> = {};

  // 各シナリオの最新データを取得
  const scenarioTypes = ["baseline", "stress", "spike", "endurance", "session"];

  for (const scenarioType of scenarioTypes) {
    const latestReport = reports.find(
      (report) =>
        report.filename.startsWith(scenarioType) &&
        report.filename.includes("enhanced"),
    );

    if (latestReport) {
      const reportData = getReportContent(latestReport.filename);
      analysis[scenarioType as keyof ScenarioAnalysis] =
        calculateScenarioMetrics(
          scenarioType,
          reportData as PerformanceReportData | null,
        );
    } else {
      // デフォルト値
      analysis[scenarioType as keyof ScenarioAnalysis] = {
        scenarioType: scenarioType as ScenarioMetrics["scenarioType"],
        keyMetrics: {},
        insights: ["データなし"],
        recommendations: ["テスト実行が必要"],
        thresholds: { warning: {}, critical: {} },
      };
    }
  }

  return analysis as ScenarioAnalysis;
}

/**
 * HTTPサーバーのリクエストハンドラー
 */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request: Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);

  // CORS対応
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // ルートアクセス - dashboard.htmlを返す
    if (pathname === "/") {
      const dashboardPath = join(PERF_RESULTS_DIR, "dashboard.html");

      if (existsSync(dashboardPath)) {
        const content = readFileSync(dashboardPath, "utf-8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(content);
      } else {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>404 Not Found</title></head>
            <body>
              <h1>❌ Dashboard not found</h1>
              <p>dashboard.htmlファイルが見つかりません: ${dashboardPath}</p>
            </body>
          </html>
        `);
      }
      return;
    }

    // 従来のダッシュボードアクセス
    if (pathname === "/dashboard") {
      const dashboardPath = join(PERF_RESULTS_DIR, "dashboard.html");
      if (existsSync(dashboardPath)) {
        const content = readFileSync(dashboardPath, "utf-8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(content);
      } else {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>404 Not Found</title></head>
            <body>
              <h1>❌ Dashboard not found</h1>
              <p>dashboard.htmlファイルが見つかりません: ${dashboardPath}</p>
            </body>
          </html>
        `);
      }
      return;
    }

    // API: レポート一覧取得
    if (pathname === "/api/reports") {
      const reports = getPerformanceReports();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            success: true,
            count: reports.length,
            reports: reports,
          },
          null,
          2,
        ),
      );
      return;
    }

    // API: 全レポートデータ取得
    if (pathname === "/api/reports/data") {
      const reports = getPerformanceReports();
      const reportsData = reports
        .map((report) => {
          const content = getReportContent(report.filename);
          if (content) {
            // ファイル形式を判定
            const type = report.filename.includes("performance_report_")
              ? "unified"
              : report.filename.includes("_enhanced_")
                ? "enhanced"
                : "other";

            return {
              filename: report.filename,
              type: type,
              metadata: {
                size: report.size,
                modified: report.modified,
                created: report.created,
              },
              data: content as Record<string, unknown>,
            };
          }
          return null;
        })
        .filter(Boolean);

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            success: true,
            count: reportsData.length,
            reports: reportsData,
            message: `Successfully loaded ${reportsData.length} report files`,
          },
          null,
          2,
        ),
      );
      return;
    }

    // API: シナリオ別分析データ取得
    if (pathname === "/api/scenarios/analysis") {
      const analysis = analyzeAllScenarios();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            success: true,
            analysis: analysis,
            timestamp: new Date().toISOString(),
            message: "Scenario analysis completed successfully",
          },
          null,
          2,
        ),
      );
      return;
    }

    // API: 特定シナリオの詳細分析
    if (
      pathname.startsWith("/api/scenarios/") &&
      pathname.endsWith("/details")
    ) {
      const scenarioType = pathname.split("/")[3]; // /api/scenarios/{type}/details
      if (
        scenarioType &&
        ["baseline", "stress", "spike", "endurance", "session"].includes(
          scenarioType,
        )
      ) {
        const reports = getPerformanceReports();
        const latestReport = reports.find(
          (report) =>
            report.filename.startsWith(scenarioType) &&
            report.filename.includes("enhanced"),
        );

        if (latestReport) {
          const reportData = getReportContent(latestReport.filename);
          const metrics = calculateScenarioMetrics(
            scenarioType,
            reportData as PerformanceReportData | null,
          );

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(
            JSON.stringify(
              {
                success: true,
                scenario: scenarioType,
                metrics: metrics,
                rawData: reportData,
                filename: latestReport.filename,
                lastUpdate: latestReport.modified,
              },
              null,
              2,
            ),
          );
        } else {
          res.writeHead(404, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(
            JSON.stringify({
              success: false,
              error: `No data found for scenario: ${scenarioType}`,
              message: "Run performance tests to generate data",
            }),
          );
        }
      } else {
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify({
            success: false,
            error: `Invalid scenario type: ${scenarioType}`,
            validTypes: ["baseline", "stress", "spike", "endurance", "session"],
          }),
        );
      }
      return;
    }

    // 個別レポートファイル取得
    if (pathname.startsWith("/reports/")) {
      const filename = pathname.replace("/reports/", "");
      const content = getReportContent(filename);

      if (content) {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify(content as Record<string, unknown>, null, 2));
      } else {
        res.writeHead(404, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify({
            success: false,
            error: `Report not found: ${filename}`,
          }),
        );
      }
      return;
    }

    // 静的ファイル（dashboard.html以外）
    const filePath = join(PERF_RESULTS_DIR, pathname.slice(1));
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const content = readFileSync(filePath);
      res.writeHead(200, { "Content-Type": getMimeType(filePath) });
      res.end(content);
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Not Found",
        path: pathname,
      }),
    );
  } catch (error) {
    console.error("❌ リクエスト処理エラー:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * サーバー起動
 */
function startServer() {
  const server = createServer(handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`🚀 ダッシュボードサーバー起動完了`);
    console.log(`📊 URL: http://${HOST}:${PORT}`);
    console.log(`📋 API エンドポイント:`);
    console.log(`   GET /api/reports                    - レポート一覧`);
    console.log(`   GET /api/reports/data               - 全レポートデータ`);
    console.log(`   GET /api/scenarios/analysis         - シナリオ別分析`);
    console.log(`   GET /api/scenarios/{type}/details   - 特定シナリオ詳細`);
    console.log(`   GET /reports/{file}                 - 個別レポート`);
    console.log(`⏹️  停止: Ctrl+C`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ ポート${PORT}は既に使用されています`);
      console.error(
        `💡 別のポートを試してください: DASHBOARD_PORT=3101 npx tsx scripts/dashboard-server.ts`,
      );
    } else {
      console.error("❌ サーバーエラー:", error);
    }
    process.exit(1);
  });

  // 終了処理
  process.on("SIGINT", () => {
    console.log(`\n⏹️  サーバーを停止中...`);
    server.close(() => {
      console.log("✅ サーバー停止完了");
      process.exit(0);
    });
  });

  return server;
}

// スクリプト直接実行時のみサーバー起動
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer, getPerformanceReports, getReportContent };
