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
import { fileURLToPath } from "url";
import pc from "picocolors";
import { v4 as uuidv4 } from "uuid";

import { ServerType, TransportType } from "@tumiki/db";
import { db } from "@tumiki/db/server";
import { runMcpSecurityScan } from "@tumiki/utils/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * URLからAPIキーをマスクする
 */
const maskApiKey = (url: string | null): string => {
  if (!url) return "N/A";

  // URLパラメータのapi-keyをマスク
  const maskedUrl = url.replace(
    /(\?|&)(api[-_]?key)=([^&]+)/gi,
    (match: string, separator: string, keyName: string, value: string) => {
      if (value.length <= 10) {
        return `${separator}${keyName}=****`;
      }
      const prefix = value.substring(0, 8);
      const suffix = value.substring(value.length - 4);
      return `${separator}${keyName}=${prefix}...${suffix}`;
    },
  );

  // パスに含まれるトークン風の文字列もマスク（40文字以上の英数字）
  return maskedUrl.replace(
    /\/([a-zA-Z0-9_-]{40,})/g,
    (_match: string, token: string) => {
      const prefix = token.substring(0, 8);
      const suffix = token.substring(token.length - 4);
      return `/${prefix}...${suffix}`;
    },
  );
};

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
        type: transportType === TransportType.SSE ? "sse" : "http",
        url,
        env: envVars,
      },
    },
  };

  await writeFile(configFile, JSON.stringify(config, null, 2));
  return configFile;
};

/**
 * 組織別のスキャン結果を生成
 */
const generateOrganizationReport = (
  organizationName: string,
  organizationId: string,
  results: ScanResult[],
): string => {
  const now = new Date().toISOString();
  let markdown = `# MCPサーバー セキュリティスキャンレポート - ${organizationName}\n\n`;
  markdown += `**組織ID**: ${organizationId}\n`;
  markdown += `**実行日時**: ${now}\n\n`;

  // 組織のサマリー計算
  const orgSummary = {
    totalServers: results.length,
    scannedServers: results.filter((r) => r.scanResult.success).length,
    failedScans: results.filter((r) => !r.scanResult.success).length,
    criticalIssues: results.reduce(
      (sum, r) =>
        sum + (r.scanResult.success ? r.scanResult.summary.criticalIssues : 0),
      0,
    ),
    warnings: results.reduce(
      (sum, r) =>
        sum + (r.scanResult.success ? r.scanResult.summary.warnings : 0),
      0,
    ),
    toxicFlows: results.reduce(
      (sum, r) =>
        sum +
        (r.scanResult.success ? r.scanResult.summary.toxicFlowsDetected : 0),
      0,
    ),
  };

  markdown += `## 📊 サマリー\n\n`;
  markdown += `| 項目 | 値 |\n`;
  markdown += `|------|----|\n`;
  markdown += `| 総サーバー数 | ${orgSummary.totalServers} |\n`;
  markdown += `| スキャン完了 | ${orgSummary.scannedServers} |\n`;
  markdown += `| スキャン失敗 | ${orgSummary.failedScans} |\n`;
  markdown += `| 重大な問題 | ${orgSummary.criticalIssues} |\n`;
  markdown += `| 警告 | ${orgSummary.warnings} |\n`;
  markdown += `| Toxic Flows | ${orgSummary.toxicFlows} |\n\n`;

  markdown += `## 📝 詳細結果\n\n`;

  for (const result of results) {
    markdown += `### ${result.serverName}\n\n`;
    markdown += `- **サーバーID**: ${result.serverId}\n`;
    markdown += `- **トランスポート**: ${result.transportType}\n`;
    markdown += `- **URL**: ${maskApiKey(result.url)}\n`;
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
 * 統合レポートを生成（全組織のサマリー）
 */
const generateSummaryReport = (
  summary: ScanSummary,
  organizationReports: Map<string, { name: string; results: ScanResult[] }>,
): string => {
  const now = new Date().toISOString();
  let markdown = `# MCPサーバー セキュリティスキャンレポート - 統合サマリー\n\n`;
  markdown += `**実行日時**: ${now}\n\n`;
  markdown += `## 📊 全体サマリー\n\n`;
  markdown += `| 項目 | 値 |\n`;
  markdown += `|------|----|\n`;
  markdown += `| 総サーバー数 | ${summary.totalServers} |\n`;
  markdown += `| スキャン完了 | ${summary.scannedServers} |\n`;
  markdown += `| スキャン失敗 | ${summary.failedScans} |\n`;
  markdown += `| 重大な問題 | ${summary.criticalIssues} |\n`;
  markdown += `| 警告 | ${summary.warnings} |\n`;
  markdown += `| Toxic Flows | ${summary.toxicFlows} |\n\n`;

  markdown += `## 🏢 組織別サマリー\n\n`;
  markdown += `| 組織 | サーバー数 | スキャン成功 | 重大な問題 | 警告 | Toxic Flows |\n`;
  markdown += `|------|------------|--------------|------------|------|-------------|\n`;

  for (const [, orgData] of organizationReports) {
    const orgResults = orgData.results;
    const successCount = orgResults.filter((r) => r.scanResult.success).length;
    const criticalCount = orgResults.reduce(
      (sum, r) =>
        sum + (r.scanResult.success ? r.scanResult.summary.criticalIssues : 0),
      0,
    );
    const warningCount = orgResults.reduce(
      (sum, r) =>
        sum + (r.scanResult.success ? r.scanResult.summary.warnings : 0),
      0,
    );
    const toxicCount = orgResults.reduce(
      (sum, r) =>
        sum +
        (r.scanResult.success ? r.scanResult.summary.toxicFlowsDetected : 0),
      0,
    );

    markdown += `| ${orgData.name} | ${orgResults.length} | ${successCount} | ${criticalCount} | ${warningCount} | ${toxicCount} |\n`;
  }

  markdown += `\n## 📁 生成されたレポート\n\n`;
  markdown += `各組織の詳細レポートは以下のファイルに保存されています:\n\n`;

  for (const [, orgData] of organizationReports) {
    const safeOrgName = orgData.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    markdown += `- **${orgData.name}**: \`mcp-security-scan-${safeOrgName}-${new Date().toISOString().split("T")[0]}.md\`\n`;
  }

  return markdown;
};

/**
 * メイン処理
 */
const main = async () => {
  console.log(pc.cyan("🔍 MCPサーバー セキュリティスキャン開始...\n"));

  try {
    // アクティブなインスタンスのあるサーバーのみを効率的に取得
    // UserMcpServerInstance → UserToolGroup → UserToolGroupTool → UserMcpServerConfig → McpServer の関係
    const servers = await db.mcpServer.findMany({
      where: {
        serverType: ServerType.OFFICIAL,
        transportType: {
          in: [TransportType.SSE, TransportType.STREAMABLE_HTTPS],
        },
        mcpServerConfigs: {
          some: {
            userToolGroupTools: {
              some: {
                toolGroup: {
                  mcpServerInstance: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
      include: {
        mcpServerConfigs: {
          where: {
            userToolGroupTools: {
              some: {
                toolGroup: {
                  mcpServerInstance: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
          include: {
            organization: true,
            userToolGroupTools: {
              where: {
                toolGroup: {
                  mcpServerInstance: {
                    deletedAt: null,
                  },
                },
              },
              select: {
                toolGroup: {
                  select: {
                    mcpServerInstance: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
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
      console.log(pc.gray(`  - URL: ${maskApiKey(server.url)}`));

      if (!server.url) {
        console.log(pc.red(`  ⏭️  URLが設定されていないためスキップ`));
        continue;
      }

      // 各設定に対してスキャンを実行（既にアクティブなインスタンスがある設定のみ取得済み）
      for (const config of server.mcpServerConfigs) {
        console.log(pc.cyan(`  📁 Organization: ${config.organization.name}`));
        console.log(pc.gray(`     - Config: ${config.name}`));
        const activeInstanceCount = config.userToolGroupTools.filter(
          (tool) => tool.toolGroup.mcpServerInstance,
        ).length;
        console.log(
          pc.gray(`     - アクティブインスタンス: ${activeInstanceCount}個`),
        );

        try {
          // envVarsをパース（Prismaの暗号化フィールドは自動的に復号化される）
          let envVarsObj: Record<string, string> = {};
          if (config.envVars) {
            try {
              // envVarsはJSONとして保存されている
              envVarsObj = JSON.parse(config.envVars) as Record<string, string>;
              if (Object.keys(envVarsObj).length > 0) {
                console.log(
                  pc.gray(
                    `    - 環境変数: ${Object.keys(envVarsObj).length}個`,
                  ),
                );
              }
            } catch {
              console.log(pc.yellow(`    ⚠️  環境変数のパースに失敗`));
              // 環境変数なしで続行
              envVarsObj = {};
            }
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

    // 組織別にスキャン結果をグループ化
    const organizationReports = new Map<
      string,
      { name: string; results: ScanResult[] }
    >();

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

    const reportDir = path.join(__dirname, "../../../reports");
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

// メイン処理を実行
main().catch((error) => {
  console.error(pc.red("実行エラー:"), error);
  process.exit(1);
});
