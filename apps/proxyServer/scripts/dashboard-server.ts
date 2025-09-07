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

interface ReportContent {
  reportInfo: {
    timestamp: string;
    version: string;
    apiKey: string;
    proxyUrl: string;
  };
  scenarios: Array<{
    name: string;
    transport: string;
    scenario: string;
    performance: {
      duration: number;
      connections: number;
      requests: {
        total: number;
        sent: number;
        average: number;
        max: number;
        min: number;
      };
      latency: {
        average: number;
        p50: number;
        p90: number;
        p99: number;
        max: number;
        min: number;
      };
      throughput: {
        average: number;
        max: number;
        min: number;
      };
      errors: number;
      successRate: number;
    };
    sessionValidation?: {
      totalSessions: number;
      validSessions: number;
      toolValidationSuccess: number;
      toolValidationFailure: number;
      averageToolCount: number;
      averageResponseTime: number;
      successRate: number;
    };
  }>;
  summary?: {
    totalScenarios: number;
    transportComparison: Record<
      string,
      {
        averageRPS: number;
        averageLatency: number;
        scenarios: number;
      }
    >;
  };
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
          file.endsWith(".json") && file.includes("performance_report_"),
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
function getReportContent(filename: string): ReportContent | null {
  try {
    const filePath = join(PERF_RESULTS_DIR, filename);
    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as ReportContent;
  } catch (error) {
    console.error(`❌ ファイル読み込みエラー (${filename}):`, error);
    return null;
  }
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
            return {
              filename: report.filename,
              metadata: {
                size: report.size,
                modified: report.modified,
                created: report.created,
              },
              data: content,
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
          },
          null,
          2,
        ),
      );
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
        res.end(JSON.stringify(content, null, 2));
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
    console.log(`   GET /api/reports      - レポート一覧`);
    console.log(`   GET /api/reports/data - 全レポートデータ`);
    console.log(`   GET /reports/{file}   - 個別レポート`);
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
