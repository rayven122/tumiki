#!/usr/bin/env tsx
/**
 * MCP Security Scan 統合テストスクリプト
 * 実際のuvx mcp-scanコマンドを使用して.mcp.jsonファイルをスキャンします
 *
 * 実行方法:
 * cd packages/utils
 * pnpm tsx src/server/security/__tests__/test-mcp-scan-integration.ts
 */
import { existsSync } from "fs";
import { resolve } from "path";

import { runMcpSecurityScan } from "../mcpScan";

// カラー出力用のヘルパー
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  success: (msg: string) =>
    console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg: string) =>
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  section: (msg: string) =>
    console.log(`\n${colors.blue}▶ ${msg}${colors.reset}`),
};

async function testMcpScan() {
  log.section("MCP Security Scan Integration Test");

  // プロジェクトルートから.mcp.jsonを探す
  const projectRoot = resolve(process.cwd(), "../..");
  const mcpConfigPath = resolve(projectRoot, ".mcp.json");

  log.info(`検証対象: ${mcpConfigPath}`);

  // ファイルの存在確認
  if (!existsSync(mcpConfigPath)) {
    log.error(`.mcp.jsonファイルが見つかりません: ${mcpConfigPath}`);
    process.exit(1);
  }

  log.info("MCP設定ファイルが見つかりました");

  try {
    // 実際のスキャン実行
    log.section("スキャン実行中...");
    const startTime = Date.now();

    const result = await runMcpSecurityScan(mcpConfigPath);

    const duration = Date.now() - startTime;
    log.info(`実行時間: ${duration}ms`);

    // 結果の検証
    log.section("スキャン結果");

    if (!result.success) {
      log.error(`スキャン失敗: ${result.error}`);
      process.exit(1);
    }

    log.success("スキャン成功");

    // サマリー表示
    log.section("サマリー");
    console.log(`  総サーバー数: ${result.summary.totalServers}`);
    console.log(`  起動成功: ${result.summary.serversStarted}`);
    console.log(`  起動失敗: ${result.summary.serversFailed}`);
    console.log(`  総ツール数: ${result.summary.totalTools}`);
    console.log(`  問題のあるツール: ${result.summary.toolsWithIssues}`);
    console.log(`  重大な問題: ${result.summary.criticalIssues}`);
    console.log(`  警告: ${result.summary.warnings}`);
    console.log(`  Toxic Flows: ${result.summary.toxicFlowsDetected}`);

    // サーバーごとの詳細
    log.section("サーバー詳細");
    for (const server of result.servers) {
      const statusEmoji = server.status === "started" ? "🟢" : "🔴";
      const riskEmoji =
        server.riskLevel === "critical"
          ? "🔴"
          : server.riskLevel === "high"
            ? "🟠"
            : server.riskLevel === "medium"
              ? "🟡"
              : server.riskLevel === "low"
                ? "🟢"
                : "✅";

      console.log(`\n  ${statusEmoji} ${server.name}`);
      console.log(`    状態: ${server.status}`);
      console.log(`    リスクレベル: ${riskEmoji} ${server.riskLevel}`);
      console.log(`    ツール数: ${server.toolCount}`);

      if (server.issues.length > 0) {
        console.log(`    問題:`);
        for (const issue of server.issues) {
          const severityEmoji =
            issue.severity === "critical"
              ? "🔴"
              : issue.severity === "high"
                ? "🟠"
                : issue.severity === "medium"
                  ? "🟡"
                  : "⚪";
          console.log(
            `      ${severityEmoji} [${issue.code}] ${issue.message}`,
          );
        }
      }

      if (server.tools.length > 0) {
        console.log(`    ツール:`);
        for (const tool of server.tools) {
          const categoryEmoji =
            tool.category === "destructive"
              ? "💥"
              : tool.category === "untrusted_content"
                ? "⚠️"
                : tool.category === "public_sink"
                  ? "🌐"
                  : tool.category === "private_data"
                    ? "🔒"
                    : "✅";

          console.log(`      ${categoryEmoji} ${tool.name} (${tool.category})`);

          if (tool.issues.length > 0) {
            for (const issue of tool.issues) {
              console.log(`        - [${issue.code}] ${issue.message}`);
            }
          }
        }
      }
    }

    // Toxic Flows
    if (result.toxicFlows.length > 0) {
      log.section("Toxic Flows 検出（潜在的リスク情報）");
      for (const flow of result.toxicFlows) {
        const severityEmoji =
          flow.severity === "critical"
            ? "🔴"
            : flow.severity === "high"
              ? "🟠"
              : flow.severity === "medium"
                ? "🟡"
                : flow.severity === "low"
                  ? "ℹ️"
                  : "⚪";

        console.log(`\n  ${severityEmoji} [${flow.code}] ${flow.type}`);
        console.log(`    メッセージ: ${flow.message}`);
        console.log(`    影響サーバー: ${flow.affectedServers.join(", ")}`);

        if (flow.toolReferences.length > 0) {
          console.log(`    関連ツール:`);
          for (const ref of flow.toolReferences) {
            console.log(
              `      - ${ref.serverName}::${ref.toolName} (${ref.riskLevel})`,
            );
          }
        }

        if (flow.mitigation) {
          console.log(`    対策: ${flow.mitigation}`);
        }
      }
    }

    // 検証結果
    log.section("検証結果");

    // 基本的な検証
    if (result.summary.totalServers === 0) {
      log.warning("サーバーが検出されませんでした");
    } else {
      log.success(`${result.summary.totalServers}個のサーバーを検出`);
    }

    if (result.summary.serversFailed > 0) {
      log.warning(`${result.summary.serversFailed}個のサーバーが起動に失敗`);
    }

    if (result.summary.criticalIssues > 0) {
      log.error(
        `${result.summary.criticalIssues}個の重大な問題が検出されました`,
      );
    } else if (result.summary.warnings > 0) {
      log.warning(`${result.summary.warnings}個の警告が検出されました`);
    } else {
      log.success("重大な問題は検出されませんでした");
    }

    if (result.summary.toxicFlowsDetected > 0) {
      // Toxic Flowは情報提供レベル（low）なので、infoとして表示
      log.info(
        `${result.summary.toxicFlowsDetected}個のToxic Flow（潜在的リスク）が検出されました`,
      );
    } else {
      log.success("Toxic Flowは検出されませんでした");
    }

    // 全体の評価
    log.section("総合評価");
    const hasHighRisk = result.servers.some(
      (s) => s.riskLevel === "critical" || s.riskLevel === "high",
    );

    if (hasHighRisk) {
      log.error("高リスクまたは重大なリスクのあるサーバーが存在します");
    } else if (result.summary.warnings > 0) {
      log.warning("軽微な問題が存在しますが、重大なリスクはありません");
    } else {
      log.success("すべてのMCPサーバーは安全です");
    }

    // JSON出力オプション
    if (process.argv.includes("--json")) {
      log.section("JSON出力");
      console.log(JSON.stringify(result, null, 2));
    }

    log.section("テスト完了");
    process.exit(hasHighRisk ? 1 : 0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`エラーが発生しました: ${errorMessage}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 実行
testMcpScan().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
