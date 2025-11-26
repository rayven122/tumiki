/**
 * MCPサーバーのセキュリティスキャンスクリプト
 *
 * 対象:
 * - ServerType: OFFICIAL
 * - TransportType: SSE または STREAMABLE_HTTPS
 *
 * Usage: pnpm run security:scan:mcp
 */
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pc from "picocolors";

import { db } from "@tumiki/db/server";

import type { OrganizationReportData, ScanResult, ScanSummary } from "./types";
import { runMcpSecurityScan } from "../utils/mcpScan";
import { fetchScannableServers, parseEnvVars } from "./db";
import { createTempConfigFile, maskApiKey } from "./helpers";
import { generateOrganizationReport, generateSummaryReport } from "./report";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * メイン処理
 */
export const main = async () => {
  console.log(pc.cyan("🔍 MCPサーバー セキュリティスキャン開始...\n"));

  try {
    // スキャン対象サーバーを取得
    const servers = await fetchScannableServers();

    console.log(pc.yellow(`📋 スキャン対象: ${servers.length} サーバー\n`));

    const summary: ScanSummary = {
      totalServers: servers.length,
      scannedServers: 0,
      failedScans: 0,
      criticalIssues: 0,
      warnings: 0,
      toxicFlows: 0,
      scanResults: [],
    };

    // 各サーバーに対してセキュリティスキャンを実行
    for (const server of servers) {
      console.log(pc.blue(`\n🔄 スキャン中: ${server.name}`));
      console.log(pc.gray(`  - ID: ${server.id}`));

      // 各テンプレートに対してスキャンを実行
      for (const template of server.mcpServers) {
        console.log(pc.cyan(`  📦 Template: ${template.name}`));
        console.log(pc.gray(`    - Transport: ${template.transportType}`));
        console.log(pc.gray(`    - URL: ${maskApiKey(template.url)}`));

        if (!template.url) {
          console.log(pc.red(`    ⏭️  URLが設定されていないためスキップ`));
          continue;
        }

        // 各設定（組織ごと）に対してスキャンを実行
        for (const config of template.mcpConfigs) {
          console.log(
            pc.cyan(`    📁 Organization: ${config.organization.name}`),
          );

          try {
            // 環境変数をパース
            const envVarsObj = parseEnvVars(config.envVars);

            if (Object.keys(envVarsObj).length > 0) {
              console.log(
                pc.gray(
                  `      - 環境変数: ${Object.keys(envVarsObj).length}個`,
                ),
              );
            }

            // 一時設定ファイルを作成
            const configFile = await createTempConfigFile(
              template.name,
              template.transportType,
              template.url,
              envVarsObj,
            );

            // セキュリティスキャン実行
            const scanResult = await runMcpSecurityScan(configFile, 60000);

            // 結果を記録
            const result: ScanResult = {
              serverId: server.id,
              serverName: template.name,
              organizationId: config.organizationId,
              organizationName: config.organization.name,
              transportType: template.transportType,
              url: template.url,
              scanResult,
              scanTime: new Date(),
            };

            summary.scanResults.push(result);

            if (scanResult.success) {
              summary.scannedServers++;
              summary.criticalIssues += scanResult.summary.criticalIssues;
              summary.warnings += scanResult.summary.warnings;
              summary.toxicFlows += scanResult.summary.toxicFlowsDetected;

              console.log(pc.green(`      ✅ スキャン完了`));
              if (scanResult.summary.criticalIssues > 0) {
                console.log(
                  pc.red(
                    `      🚨 重大な問題: ${scanResult.summary.criticalIssues}`,
                  ),
                );
              }
              if (scanResult.summary.warnings > 0) {
                console.log(
                  pc.yellow(`      ⚠️  警告: ${scanResult.summary.warnings}`),
                );
              }
              if (scanResult.summary.toxicFlowsDetected > 0) {
                console.log(
                  pc.magenta(
                    `      🌊 Toxic Flows: ${scanResult.summary.toxicFlowsDetected}`,
                  ),
                );
              }
            } else {
              summary.failedScans++;
              console.log(pc.red(`      ❌ スキャン失敗: ${scanResult.error}`));
            }

            // 一時ファイルのクリーンアップ
            await unlink(configFile).catch(() => {
              // エラーは無視（ファイルが既に削除されている場合など）
            });
          } catch (error) {
            summary.failedScans++;
            console.error(
              pc.red(
                `      ❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
        }
      }
    }

    // 組織別にスキャン結果をグループ化
    const organizationReports = new Map<string, OrganizationReportData>();

    for (const result of summary.scanResults) {
      const orgId = result.organizationId;
      if (!organizationReports.has(orgId)) {
        organizationReports.set(orgId, {
          name: result.organizationName,
          results: [],
        });
      }
      organizationReports.get(orgId)?.results.push(result);
    }

    // レポート生成
    console.log(pc.cyan("\n\n📊 レポート生成中..."));

    const reportDir = path.join(__dirname, "../../../../reports");
    await mkdir(reportDir, { recursive: true });

    const dateStr = new Date().toISOString().split("T")[0];

    // 各組織のレポートを生成
    for (const [orgId, orgData] of organizationReports) {
      const safeOrgName = orgData.name
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      const orgReportFile = path.join(
        reportDir,
        `mcp-security-scan-${safeOrgName}-${dateStr}.md`,
      );
      const orgMarkdown = generateOrganizationReport(
        orgData.name,
        orgId,
        orgData.results,
      );
      await writeFile(orgReportFile, orgMarkdown, "utf-8");
      console.log(pc.green(`✅ 組織レポート生成: ${orgReportFile}`));

      // 組織別のJSON形式でも保存
      const orgJsonFile = path.join(
        reportDir,
        `mcp-security-scan-${safeOrgName}-${dateStr}.json`,
      );
      const orgJsonData = {
        organizationId: orgId,
        organizationName: orgData.name,
        scanDate: new Date().toISOString(),
        results: orgData.results,
      };
      await writeFile(
        orgJsonFile,
        JSON.stringify(orgJsonData, null, 2),
        "utf-8",
      );
    }

    // 統合サマリーレポートを生成
    const summaryReportFile = path.join(
      reportDir,
      `mcp-security-scan-summary-${dateStr}.md`,
    );
    const summaryMarkdown = generateSummaryReport(summary, organizationReports);
    await writeFile(summaryReportFile, summaryMarkdown, "utf-8");
    console.log(pc.green(`\n✅ 統合レポート生成: ${summaryReportFile}`));

    // サマリー表示
    console.log(pc.cyan("\n\n=== スキャンサマリー ==="));
    console.log(`総サーバー数: ${summary.totalServers}`);
    console.log(`スキャン完了: ${pc.green(String(summary.scannedServers))}`);
    console.log(`スキャン失敗: ${pc.red(String(summary.failedScans))}`);
    console.log(`重大な問題: ${pc.red(String(summary.criticalIssues))}`);
    console.log(`警告: ${pc.yellow(String(summary.warnings))}`);
    console.log(`Toxic Flows: ${pc.magenta(String(summary.toxicFlows))}`);

    console.log(pc.cyan("\n=== 組織別サマリー ==="));
    for (const [, orgData] of organizationReports) {
      const orgResults = orgData.results;
      const successCount = orgResults.filter(
        (r) => r.scanResult.success,
      ).length;
      const criticalCount = orgResults.reduce(
        (sum, r) =>
          sum +
          (r.scanResult.success ? r.scanResult.summary.criticalIssues : 0),
        0,
      );
      const warningCount = orgResults.reduce(
        (sum, r) =>
          sum + (r.scanResult.success ? r.scanResult.summary.warnings : 0),
        0,
      );

      console.log(`\n${pc.blue(orgData.name)}:`);
      console.log(`  サーバー数: ${orgResults.length}`);
      console.log(`  スキャン成功: ${pc.green(String(successCount))}`);
      console.log(
        `  重大な問題: ${criticalCount > 0 ? pc.red(String(criticalCount)) : pc.gray("0")}`,
      );
      console.log(
        `  警告: ${warningCount > 0 ? pc.yellow(String(warningCount)) : pc.gray("0")}`,
      );
    }

    // 統合JSON形式でも保存
    const jsonFile = path.join(
      reportDir,
      `mcp-security-scan-summary-${dateStr}.json`,
    );
    await writeFile(jsonFile, JSON.stringify(summary, null, 2), "utf-8");
    console.log(pc.green(`\n✅ JSON出力: ${jsonFile}`));

    process.exit(summary.criticalIssues > 0 ? 1 : 0);
  } catch (error) {
    console.error(pc.red("\n❌ スキャン中にエラーが発生しました:"));
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
};

// エラーハンドリング
process.on("unhandledRejection", (error) => {
  console.error(pc.red("未処理のエラー:"), error);
  process.exit(1);
});

// このファイルが直接実行された場合のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(pc.red("実行エラー:"), error);
    process.exit(1);
  });
}
