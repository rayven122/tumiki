import { exec } from "child_process";
import { unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const execAsync = promisify(exec);

/**
 * mcp-scanツールから生で出力される問題のZodスキーマ
 * スキャナーによって異なるフィールド名を使用する可能性がある
 */
export const McpIssueSchema = z.object({
  code: z.string().nullish(),
  message: z.string().nullish(),
  extra_data: z.record(z.unknown()).nullish(),
  reference: z.unknown().nullable().nullish(),
});

/**
 * 個別のMCPサーバーのスキャン結果のZodスキーマ
 */
export const McpServerResultSchema = z.object({
  /** サーバーで検出されたセキュリティ問題 */
  security_issues: z.array(McpIssueSchema).optional(),
});

/**
 * mcp-scanツールからのJSON出力のZodスキーマ
 */
export const McpScanOutputSchema = z.object({
  /** サーバーごとのスキャン結果 */
  servers: z.array(McpServerResultSchema),
  /** グローバルなセキュリティ問題 */
  issues: z.array(McpIssueSchema).optional(),
});

/**
 * MCPセキュリティスキャンの実行結果のZodスキーマ
 */
export const McpScanResultSchema = z.object({
  /** スキャンが正常に完了したかどうか */
  success: z.boolean(),
  /** 検出されたセキュリティ問題のリスト */
  issues: z.array(McpIssueSchema),
  /** エラーが発生した場合のメッセージ */
  error: z.string().optional(),
});

// Zodスキーマから型を生成
export type McpIssue = z.infer<typeof McpIssueSchema>;
export type McpServerResult = z.infer<typeof McpServerResultSchema>;
export type McpScanOutput = z.infer<typeof McpScanOutputSchema>;
export type McpScanResult = z.infer<typeof McpScanResultSchema>;

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
      `uvx mcp-scan@latest "${configFile}" --json --server-timeout 30 --suppress-mcpserver-io true`,
      { timeout },
    );

    if (stderr && !stderr.includes("warning")) {
      console.error("mcp-scan stderr:", stderr);
    }

    try {
      // JSON出力をパース
      const scanOutput: unknown = JSON.parse(stdout);

      // Zodスキーマで検証と変換
      const parsedResult = z.record(McpScanOutputSchema).parse(scanOutput);
      const mcpScanOutput = parsedResult[configFile];

      console.log("Parsed mcp-scan output:", mcpScanOutput);
      // スキャン結果を標準化された形式に変換
      return {
        success: true,
        issues: mcpScanOutput?.issues ?? [],
        error: undefined,
      };
    } catch (parseError) {
      return {
        success: false,
        issues: [
          {
            code: "parse_error",
            message: "スキャン結果の解析中にエラーが発生しました",
          },
        ],
        error:
          parseError instanceof Error
            ? parseError.message
            : "Unknown parse error",
      };
    }
  } catch (error) {
    console.error("mcp-scan execution error:", error);

    // タイムアウトエラーの場合
    if (error instanceof Error && error.message.includes("ETIMEDOUT")) {
      return {
        success: false,
        issues: [
          {
            code: "scan_timeout",
            message: "セキュリティスキャンがタイムアウトしました",
          },
        ],
        error: "Scan timeout",
      };
    }

    // エラーメッセージから機密情報を除去
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      // コマンドラインの詳細を含まないエラーメッセージに変換
      if (error.message.includes("Command failed")) {
        errorMessage = "セキュリティスキャンツールの実行に失敗しました";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      issues: [
        {
          code: "scan_error",
          message: "セキュリティスキャンの実行に失敗しました",
        },
      ],
      error: errorMessage,
    };
  } finally {
    // 一時ファイルを削除
    try {
      await unlink(configFile);
    } catch {
      // エラーを無視
      console.warn(`Failed to delete temporary file`);
    }
  }
};
