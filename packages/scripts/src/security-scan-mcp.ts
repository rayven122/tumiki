#!/usr/bin/env node

/**
 * MCPサーバーのセキュリティスキャンスクリプト
 *
 * 対象：
 * - ServerType: OFFICIAL
 * - TransportType: SSE または STREAMABLE_HTTPS
 *
 * Usage: pnpm run security:scan:mcp
 */
import { mkdir, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { config as loadEnv } from "dotenv";
import pc from "picocolors";
import { v4 as uuidv4 } from "uuid";

import { ServerType, TransportType } from "@tumiki/db";
import { db } from "@tumiki/db/server";
import { runMcpSecurityScan } from "@tumiki/utils/server";

// 環境変数を読み込み
loadEnv({ path: path.resolve(__dirname, "../../../.env") });

interface ScanResult {
  serverId: string;
  serverName: string;
  organizationId: string;
  organizationName: string;
  transportType: TransportType;
  url: string | null;
  scanResult: Awaited<ReturnType<typeof runMcpSecurityScan>>;
  scanTime: Date;
}

interface ScanSummary {
  totalServers: number;
  scannedServers: number;
  failedScans: number;
  criticalIssues: number;
  warnings: number;
  toxicFlows: number;
  scanResults: ScanResult[];
}

/**
 * 一時的な設定ファイルを作成
 */
const createTempConfigFile = async (
  serverName: string,
  transportType: TransportType,
  url: string,
  envVars: Record<string, string>,
): Promise<string> => {
  const tempDir = os.tmpdir();
  const configFile = path.join(tempDir, `mcp-config-${uuidv4()}.json`);

  const config = {
    mcpServers: {
      [serverName]: {
        url,
        transport: {
          type:
            transportType === TransportType.SSE ? "sse" : "streamable_https",
        },
        headers: envVars,
      },
    },
  };

  await writeFile(configFile, JSON.stringify(config, null, 2));
  return configFile;
};

/**
 * スキャン結果をマークダウン形式で出力
 */
const generateMarkdownReport = (summary: ScanSummary): string => {
  const now = new Date().toISOString();
  let markdown = `# MCPサーバー セキュリティスキャンレポート\n\n`;
  markdown += `**実行日時**: ${now}\n\n`;
  markdown += `## 📊 サマリー\n\n`;
  markdown += `| 項目 | 値 |\n`;
  markdown += `|------|----|\n`;
  markdown += `| 総サーバー数 | ${summary.totalServers} |\n`;
  markdown += `| スキャン完了 | ${summary.scannedServers} |\n`;
  markdown += `| スキャン失敗 | ${summary.failedScans} |\n`;
  markdown += `| 重大な問題 | ${summary.criticalIssues} |\n`;
  markdown += `| 警告 | ${summary.warnings} |\n`;
  markdown += `| Toxic Flows | ${summary.toxicFlows} |\n\n`;

  markdown += `## 📝 詳細結果\n\n`;

  for (const result of summary.scanResults) {
    markdown += `### ${result.serverName}\n\n`;
    markdown += `- **サーバーID**: ${result.serverId}\n`;
    markdown += `- **組織**: ${result.organizationName} (${result.organizationId})\n`;
    markdown += `- **トランスポート**: ${result.transportType}\n`;
    markdown += `- **URL**: ${result.url ?? "N/A"}\n`;
    markdown += `- **スキャン時刻**: ${result.scanTime.toISOString()}\n\n`;

    const scan = result.scanResult;
    if (scan.success) {
      markdown += `#### ✅ スキャン成功\n\n`;
      markdown += `**統計**:\n`;
      markdown += `- サーバー起動数: ${scan.summary.serversStarted}\n`;
      markdown += `- サーバー失敗数: ${scan.summary.serversFailed}\n`;
      markdown += `- ツール総数: ${scan.summary.totalTools}\n`;
      markdown += `- 問題のあるツール: ${scan.summary.toolsWithIssues}\n`;
      markdown += `- 重大な問題: ${scan.summary.criticalIssues}\n`;
      markdown += `- 警告: ${scan.summary.warnings}\n`;
      markdown += `- Toxic Flows検出: ${scan.summary.toxicFlowsDetected}\n\n`;

      if (scan.servers.length > 0) {
        markdown += `**サーバー詳細**:\n`;
        for (const server of scan.servers) {
          markdown += `- **${server.name}** (${server.status})\n`;
          markdown += `  - リスクレベル: ${server.riskLevel}\n`;
          markdown += `  - ツール数: ${server.toolCount}\n`;
          if (server.issues.length > 0) {
            markdown += `  - 問題:\n`;
            for (const issue of server.issues) {
              markdown += `    - [${issue.severity}] ${issue.message}\n`;
            }
          }
          if (server.tools.length > 0) {
            markdown += `  - ツール:\n`;
            for (const tool of server.tools) {
              if (tool.issues.length > 0) {
                markdown += `    - **${tool.name}** (${tool.category})\n`;
                for (const issue of tool.issues) {
                  markdown += `      - [${issue.severity}] ${issue.message}\n`;
                  if (issue.suggestion) {
                    markdown += `        💡 ${issue.suggestion}\n`;
                  }
                }
              }
            }
          }
        }
        markdown += "\n";
      }

      if (scan.toxicFlows.length > 0) {
        markdown += `**⚠️ Toxic Flows**:\n`;
        for (const flow of scan.toxicFlows) {
          markdown += `- **${flow.code}** (${flow.type})\n`;
          markdown += `  - 重要度: ${flow.severity}\n`;
          markdown += `  - メッセージ: ${flow.message}\n`;
          if (flow.mitigation) {
            markdown += `  - 対策: ${flow.mitigation}\n`;
          }
          if (flow.affectedServers.length > 0) {
            markdown += `  - 影響サーバー: ${flow.affectedServers.join(", ")}\n`;
          }
        }
        markdown += "\n";
      }
    } else {
      markdown += `#### ❌ スキャン失敗\n\n`;
      markdown += `**エラー**: ${scan.error}\n\n`;
    }
  }

  return markdown;
};

/**
 * メイン処理
 */
const main = async () => {
  console.log(pc.cyan("🔍 MCPサーバー セキュリティスキャン開始...\n"));

  try {
    // 対象のMCPサーバーを取得
    const servers = await db.mcpServer.findMany({
      where: {
        serverType: ServerType.OFFICIAL,
        transportType: {
          in: [TransportType.SSE, TransportType.STREAMABLE_HTTPS],
        },
      },
      include: {
        mcpServerConfigs: {
          include: {
            organization: true,
          },
        },
      },
    });

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
      console.log(pc.gray(`  - Transport: ${server.transportType}`));
      console.log(pc.gray(`  - URL: ${server.url ?? "N/A"}`));

      if (!server.url) {
        console.log(pc.red(`  ⏭️  URLが設定されていないためスキップ`));
        continue;
      }

      // 各設定に対してスキャンを実行
      for (const config of server.mcpServerConfigs) {
        console.log(
          pc.gray(`  - Config: ${config.name} (${config.organization.name})`),
        );

        try {
          // envVarsをデコード（暗号化されているため、実際の実装では復号化が必要）
          let envVarsObj: Record<string, string> = {};
          try {
            // 注意：実際の実装では暗号化されたデータの復号化が必要
            // ここではダミーの処理として空オブジェクトを使用
            console.log(
              pc.yellow(
                `    ⚠️  環境変数の復号化はスキップ（暗号化対応未実装）`,
              ),
            );
            envVarsObj = {};
          } catch {
            console.log(pc.red(`    ❌ 環境変数の復号化に失敗`));
            continue;
          }

          // 一時設定ファイルを作成
          const configFile = await createTempConfigFile(
            server.name,
            server.transportType,
            server.url,
            envVarsObj,
          );

          // セキュリティスキャン実行
          const scanResult = await runMcpSecurityScan(configFile, 60000);

          // 結果を記録
          const result: ScanResult = {
            serverId: server.id,
            serverName: server.name,
            organizationId: config.organizationId,
            organizationName: config.organization.name,
            transportType: server.transportType,
            url: server.url,
            scanResult,
            scanTime: new Date(),
          };

          summary.scanResults.push(result);

          if (scanResult.success) {
            summary.scannedServers++;
            summary.criticalIssues += scanResult.summary.criticalIssues;
            summary.warnings += scanResult.summary.warnings;
            summary.toxicFlows += scanResult.summary.toxicFlowsDetected;

            console.log(pc.green(`    ✅ スキャン完了`));
            if (scanResult.summary.criticalIssues > 0) {
              console.log(
                pc.red(
                  `    🚨 重大な問題: ${scanResult.summary.criticalIssues}`,
                ),
              );
            }
            if (scanResult.summary.warnings > 0) {
              console.log(
                pc.yellow(`    ⚠️  警告: ${scanResult.summary.warnings}`),
              );
            }
            if (scanResult.summary.toxicFlowsDetected > 0) {
              console.log(
                pc.magenta(
                  `    🌊 Toxic Flows: ${scanResult.summary.toxicFlowsDetected}`,
                ),
              );
            }
          } else {
            summary.failedScans++;
            console.log(pc.red(`    ❌ スキャン失敗: ${scanResult.error}`));
          }

          // 一時ファイルのクリーンアップ
          const { unlink } = await import("fs/promises");
          await unlink(configFile).catch(() => {
            // エラーは無視（ファイルが既に削除されている場合など）
          });
        } catch (error) {
          summary.failedScans++;
          console.error(
            pc.red(
              `    ❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }
      }
    }

    // レポート生成
    console.log(pc.cyan("\n\n📊 レポート生成中..."));

    const reportDir = path.join(__dirname, "../../../reports");
    await mkdir(reportDir, { recursive: true });

    const reportFile = path.join(
      reportDir,
      `mcp-security-scan-${new Date().toISOString().split("T")[0]}.md`,
    );
    const markdownReport = generateMarkdownReport(summary);
    await writeFile(reportFile, markdownReport, "utf-8");

    console.log(pc.green(`\n✅ レポート生成完了: ${reportFile}`));

    // サマリー表示
    console.log(pc.cyan("\n\n=== スキャンサマリー ==="));
    console.log(`総サーバー数: ${summary.totalServers}`);
    console.log(`スキャン完了: ${pc.green(String(summary.scannedServers))}`);
    console.log(`スキャン失敗: ${pc.red(String(summary.failedScans))}`);
    console.log(`重大な問題: ${pc.red(String(summary.criticalIssues))}`);
    console.log(`警告: ${pc.yellow(String(summary.warnings))}`);
    console.log(`Toxic Flows: ${pc.magenta(String(summary.toxicFlows))}`);

    // JSON形式でも保存
    const jsonFile = path.join(
      reportDir,
      `mcp-security-scan-${new Date().toISOString().split("T")[0]}.json`,
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

// メイン処理を実行
main().catch((error) => {
  console.error(pc.red("実行エラー:"), error);
  process.exit(1);
});
