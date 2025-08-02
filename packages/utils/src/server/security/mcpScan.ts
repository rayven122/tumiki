import { exec } from "child_process";
import { unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

/**
 * MCPセキュリティスキャンで検出された個別のセキュリティ問題
 */
export interface McpSecurityIssue {
  /** 問題の種類（例: tool_poisoning, cross_origin, rug_pull, toxic_flow） */
  type: string;
  /** 問題の深刻度レベル */
  severity: "critical" | "high" | "medium" | "low" | "info";
  /** 問題が検出されたMCPツールの名前（該当する場合） */
  toolName?: string;
  /** 問題の詳細な説明 */
  description: string;
  /** 問題に関する追加の詳細情報（スキャナー固有のデータ） */
  details?: unknown;
  /** 問題への対処方法に関する推奨事項 */
  recommendation?: string;
}

/**
 * MCPセキュリティスキャンの実行結果
 */
export interface McpScanResult {
  /** スキャンが正常に完了したかどうか */
  success: boolean;
  /** 検出された問題の最大リスクレベル */
  riskLevel: "critical" | "high" | "medium" | "low" | "none";
  /** 検出されたセキュリティ問題のリスト */
  issues: McpSecurityIssue[];
  /** mcp-scanツールからの生の出力データ（デバッグ用） */
  rawOutput?: unknown;
  /** エラーが発生した場合のエラーメッセージ */
  error?: string;
}

/**
 * mcp-scanツールからのJSON出力の型定義
 */
export interface McpScanOutput {
  /** サーバーごとのスキャン結果 */
  servers?: Record<string, McpServerResult>;
  /** グローバルなセキュリティ問題 */
  issues?: McpRawIssue[];
}

/**
 * 個別のMCPサーバーのスキャン結果
 */
export interface McpServerResult {
  /** サーバーで検出されたセキュリティ問題 */
  security_issues?: McpRawIssue[];
}

/**
 * mcp-scanツールから生で出力される問題の型定義
 * スキャナーによって異なるフィールド名を使用する可能性がある
 */
export interface McpRawIssue {
  /** 問題の種類 */
  type?: string;
  /** 深刻度（スキャナーによっては「severity」を使用） */
  severity?: string;
  /** 深刻度（スキャナーによっては「level」を使用） */
  level?: string;
  /** 問題が関連するツール名（スキャナーによっては「tool」を使用） */
  tool?: string;
  /** 問題が関連するツール名（スキャナーによっては「tool_name」を使用） */
  tool_name?: string;
  /** 問題の説明（スキャナーによっては「description」を使用） */
  description?: string;
  /** 問題の説明（スキャナーによっては「message」を使用） */
  message?: string;
  /** 追加の詳細情報（スキャナーによっては「details」を使用） */
  details?: unknown;
  /** 追加の詳細情報（スキャナーによっては「data」を使用） */
  data?: unknown;
}

/**
 * MCPサーバーのセキュリティスキャンを実行
 *
 * この関数は以下の処理を行います：
 * 1. 一時的な設定ファイルを作成してMCPサーバー情報を記述
 * 2. mcp-scanツール（uvx経由）を実行してセキュリティ脆弱性をチェック
 * 3. スキャン結果を解析して標準化された形式で返却
 * 4. 一時ファイルをクリーンアップ
 *
 * @param serverUrl MCPサーバーのURL（SSEトランスポートを使用）
 * @param apiKey MCPサーバーへのアクセスに必要なAPIキー
 * @param timeout タイムアウト時間（ミリ秒）。デフォルトは60秒
 * @returns スキャン結果（成功/失敗、リスクレベル、検出された問題のリスト）
 * @throws タイムアウトやその他のエラーの場合でも、エラー情報を含む結果オブジェクトを返却
 */
export const runMcpSecurityScan = async (
  serverUrl: string,
  apiKey: string,
  timeout = 60000,
): Promise<McpScanResult> => {
  const tempDir = os.tmpdir();
  const configFile = path.join(tempDir, `mcp-config-${uuidv4()}.json`);

  try {
    // 一時的な設定ファイルを作成
    const config = {
      mcpServers: {
        "temp-server": {
          url: serverUrl,
          transport: {
            type: "sse",
          },
          headers: {
            "api-key": apiKey,
            "x-validation-mode": "true", // 検証モードを有効化
          },
        },
      },
    };

    await writeFile(configFile, JSON.stringify(config, null, 2));

    // mcp-scanを実行（JSONフォーマットで結果を取得）
    const { stdout, stderr } = await execAsync(
      `uvx mcp-scan@latest "${configFile}" --json --server-timeout 30 --suppress-mcpserver-io`,
      { timeout },
    );

    if (stderr && !stderr.includes("warning")) {
      console.error("mcp-scan stderr:", stderr);
    }

    // 結果をパース
    let scanOutput: unknown;
    try {
      scanOutput = JSON.parse(stdout);
    } catch {
      // JSON パースに失敗した場合、標準出力から情報を抽出
      console.warn("Failed to parse mcp-scan JSON output:", stdout);
      return {
        success: false,
        riskLevel: "none",
        issues: [],
        rawOutput: stdout,
        error: "Failed to parse scan results",
      };
    }

    // スキャン結果を解析
    return parseScanResult(scanOutput);
  } catch (error) {
    console.error("mcp-scan execution error:", error);

    // タイムアウトエラーの場合
    if (error instanceof Error && error.message.includes("ETIMEDOUT")) {
      return {
        success: false,
        riskLevel: "high",
        issues: [
          {
            type: "scan_timeout",
            severity: "high",
            description: "セキュリティスキャンがタイムアウトしました",
            details: { timeout, error: error.message },
            recommendation: "サーバーの応答時間を確認してください",
          },
        ],
        error: "Scan timeout",
      };
    }

    return {
      success: false,
      riskLevel: "high",
      issues: [
        {
          type: "scan_error",
          severity: "critical",
          description: "セキュリティスキャンの実行に失敗しました",
          details: error instanceof Error ? { message: error.message } : error,
          recommendation: "システム管理者に連絡してください",
        },
      ],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    // 一時ファイルを削除
    try {
      await unlink(configFile);
    } catch {
      // エラーを無視
    }
  }
};

/**
 * mcp-scanの出力を解析して標準化された結果を返す
 *
 * この関数は以下の処理を行います：
 * 1. JSON出力の構造を検証
 * 2. サーバーごとのセキュリティ問題を抽出
 * 3. グローバルなセキュリティ問題を抽出
 * 4. 各問題を標準化された形式に変換
 * 5. 最大リスクレベルを計算
 *
 * @param scanOutput mcp-scanツールからのJSON出力（unknown型）
 * @returns 標準化されたスキャン結果
 */
export const parseScanResult = (scanOutput: unknown): McpScanResult => {
  const issues: McpSecurityIssue[] = [];
  let maxSeverity: McpScanResult["riskLevel"] = "none";

  // スキャン結果の構造を確認
  if (!scanOutput || typeof scanOutput !== "object") {
    return {
      success: false,
      riskLevel: "none",
      issues: [],
      rawOutput: scanOutput,
      error: "Invalid scan output format",
    };
  }

  const typedScanOutput = scanOutput as McpScanOutput;

  // サーバーごとの結果を解析
  if (typedScanOutput.servers) {
    for (const [, serverResult] of Object.entries(typedScanOutput.servers)) {
      const serverIssues = serverResult;

      if (Array.isArray(serverIssues.security_issues)) {
        for (const issue of serverIssues.security_issues) {
          const normalizedIssue = normalizeIssue(issue);
          issues.push(normalizedIssue);

          // 最大深刻度を更新
          maxSeverity = updateMaxSeverity(
            maxSeverity,
            normalizedIssue.severity,
          );
        }
      }
    }
  }

  // グローバルな問題も確認
  if (Array.isArray(typedScanOutput.issues)) {
    for (const issue of typedScanOutput.issues) {
      const normalizedIssue = normalizeIssue(issue);
      issues.push(normalizedIssue);
      maxSeverity = updateMaxSeverity(maxSeverity, normalizedIssue.severity);
    }
  }

  return {
    success: true,
    riskLevel: maxSeverity,
    issues,
    rawOutput: scanOutput,
  };
};

/**
 * 問題を標準化された形式に変換
 *
 * mcp-scanツールから出力される様々な形式の問題データを
 * 統一された McpSecurityIssue 形式に変換します。
 * スキャナーによって異なるフィールド名をマッピングし、
 * 問題タイプに応じた推奨事項を追加します。
 *
 * @param issue 生の問題データ（スキャナー固有の形式）
 * @returns 標準化されたセキュリティ問題
 */
export const normalizeIssue = (issue: McpRawIssue): McpSecurityIssue => {
  const type = issue.type ?? "unknown";
  const severity = normalizeSeverity(issue.severity ?? issue.level ?? "info");

  // 問題タイプに基づいた推奨事項を生成
  const recommendation = getRecommendation(type, severity);

  return {
    type,
    severity,
    toolName: issue.tool ?? issue.tool_name,
    description: issue.description ?? issue.message ?? "不明な問題",
    details: issue.details ?? issue.data,
    recommendation,
  };
};

/**
 * 深刻度を正規化
 *
 * 様々なスキャナーが使用する異なる深刻度表現を
 * 統一された5段階の深刻度レベルに変換します。
 *
 * マッピング例：
 * - "critical", "error" → "critical"
 * - "high", "severe" → "high"
 * - "medium", "moderate", "warning" → "medium"
 * - "low", "minor" → "low"
 * - その他 → "info"
 *
 * @param severity 生の深刻度文字列
 * @returns 正規化された深刻度レベル
 */
export const normalizeSeverity = (
  severity: string,
): McpSecurityIssue["severity"] => {
  const normalizedSeverity = severity.toLowerCase();
  switch (normalizedSeverity) {
    case "critical":
    case "error":
      return "critical";
    case "high":
    case "severe":
      return "high";
    case "medium":
    case "moderate":
    case "warning":
      return "medium";
    case "low":
    case "minor":
      return "low";
    default:
      return "info";
  }
};

/**
 * 最大深刻度を更新
 *
 * 現在の最大深刻度と新しい深刻度を比較し、
 * より高い深刻度を返します。
 *
 * 深刻度の順位：
 * critical (4) > high (3) > medium (2) > low (1) > none (0)
 *
 * @param current 現在の最大深刻度
 * @param newSeverity 新しい深刻度（"info"は"low"として扱う）
 * @returns 更新された最大深刻度
 */
export const updateMaxSeverity = (
  current: McpScanResult["riskLevel"],
  newSeverity: McpSecurityIssue["severity"],
): McpScanResult["riskLevel"] => {
  const severityOrder: Record<McpScanResult["riskLevel"], number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    none: 0,
  };

  const newLevel = newSeverity === "info" ? "low" : newSeverity;

  return severityOrder[newLevel] > severityOrder[current] ? newLevel : current;
};

/**
 * 問題タイプに基づいた推奨事項を生成
 *
 * セキュリティ問題のタイプと深刻度に応じて、
 * 適切な対処方法の推奨事項を生成します。
 *
 * 既知の問題タイプ：
 * - tool_poisoning: ツール説明文への悪意のあるプロンプト注入
 * - cross_origin: 異なるオリジンへのアクセス
 * - rug_pull: ツール定義の変更
 * - toxic_flow: 危険な操作フロー
 * - scan_timeout: スキャンのタイムアウト
 * - scan_error: スキャンエラー
 *
 * @param type 問題のタイプ
 * @param severity 問題の深刻度
 * @returns 日本語の推奨事項メッセージ
 */
export const getRecommendation = (
  type: string,
  severity: McpSecurityIssue["severity"],
): string => {
  const recommendations: Record<string, string> = {
    tool_poisoning:
      "ツールの説明文に悪意のあるプロンプトが含まれている可能性があります。ツールの使用を慎重に検討してください。",
    cross_origin:
      "異なるオリジンへのアクセスが検出されました。意図しないデータ漏洩のリスクがあります。",
    rug_pull:
      "ツールの定義が変更されている可能性があります。サーバーの信頼性を確認してください。",
    toxic_flow:
      "危険な操作フローが検出されました。ツールの組み合わせを見直してください。",
    scan_timeout:
      "スキャンがタイムアウトしました。サーバーの応答性を確認してください。",
    scan_error:
      "スキャンエラーが発生しました。システム管理者に連絡してください。",
  };

  const recommendation = recommendations[type];
  if (recommendation) {
    return recommendation;
  }

  // デフォルトの推奨事項
  if (severity === "critical" || severity === "high") {
    return "この問題は重大なセキュリティリスクをもたらす可能性があります。使用前に十分な検証を行ってください。";
  } else if (severity === "medium") {
    return "潜在的なセキュリティリスクが検出されました。注意して使用してください。";
  } else {
    return "軽微な問題が検出されました。必要に応じて対処してください。";
  }
};
