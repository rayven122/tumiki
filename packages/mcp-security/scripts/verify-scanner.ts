/**
 * セキュリティスキャナーの動作検証スクリプト
 *
 * 実行方法:
 * npx tsx scripts/verify-scanner.ts
 */

import {
  isMcpScanAvailable,
  scanToolsForVulnerabilities,
} from "../src/security/scanner.js";

const main = async () => {
  console.log("=== MCP Security Scanner 検証 ===\n");

  // 1. mcp-scan が利用可能かチェック
  console.log("1. mcp-scan 利用可能チェック...");
  const isAvailable = await isMcpScanAvailable();
  console.log(`   結果: ${isAvailable ? "✅ 利用可能" : "❌ 利用不可"}\n`);

  if (!isAvailable) {
    console.log(
      "mcp-scan が利用できないため、スキャンテストをスキップします。",
    );
    console.log("uvx を使用して mcp-scan をインストールしてください。");
    return;
  }

  // 2. テスト用 MCP サーバーに対してスキャン実行
  // 注: 実際のテストには有効な MCP サーバー URL が必要
  console.log("2. スキャン実行テスト...");

  // テスト用のダミーサーバー（存在しない）に対してスキャン
  // エラーハンドリングが正しく動作するかを確認
  const testInput = {
    serverName: "test-server",
    serverUrl: "https://example.com/mcp/sse",
  };

  console.log(`   サーバー名: ${testInput.serverName}`);
  console.log(`   URL: ${testInput.serverUrl}`);

  const result = await scanToolsForVulnerabilities(testInput, {
    timeoutMs: 30000,
  });

  console.log("\n   スキャン結果:");
  console.log(`   - ステータス: ${result.status}`);
  console.log(`   - タイムスタンプ: ${result.scanTimestamp}`);
  console.log(`   - 実行時間: ${result.executionTimeMs}ms`);
  console.log(`   - 脆弱性数: ${result.vulnerabilities.length}`);

  if (result.errorMessage) {
    console.log(`   - エラー: ${result.errorMessage}`);
  }

  if (result.vulnerabilities.length > 0) {
    console.log("\n   検出された脆弱性:");
    for (const vuln of result.vulnerabilities) {
      console.log(
        `     - [${vuln.severity.toUpperCase()}] ${vuln.type}: ${vuln.toolName}`,
      );
      console.log(`       ${vuln.description}`);
    }
  }

  console.log("\n=== 検証完了 ===");
};

main().catch(console.error);
