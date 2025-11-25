import type { OrganizationReportData, ScanResult, ScanSummary } from "./types";
import { maskApiKey } from "./helpers";

/**
 * 組織別のスキャン結果を生成
 */
export const generateOrganizationReport = (
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
export const generateSummaryReport = (
  summary: ScanSummary,
  organizationReports: Map<string, OrganizationReportData>,
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
