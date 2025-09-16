import { exec } from "child_process";
import { readFile, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const execAsync = promisify(exec);

// ========================================
// 生のmcp-scan JSON出力用のスキーマ
// ========================================

/**
 * ツールのアノテーション情報
 */
const ToolAnnotationsSchema = z.object({
  title: z.string().nullish(),
  readOnlyHint: z.boolean().nullish(),
  destructiveHint: z.boolean().nullish(),
  idempotentHint: z.boolean().nullish(),
  openWorldHint: z.boolean().nullish(),
});

/**
 * MCPツールの定義
 */
const McpToolSchema = z.object({
  name: z.string(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  inputSchema: z.record(z.unknown()).nullish(),
  outputSchema: z.record(z.unknown()).nullish(),
  annotations: ToolAnnotationsSchema.nullish(),
  meta: z.unknown().nullish(),
});

/**
 * MCPサーバーのシグネチャ
 */
const McpServerSignatureSchema = z.object({
  metadata: z.record(z.unknown()).nullish(),
  prompts: z.array(z.unknown()).default([]),
  resources: z.array(z.unknown()).default([]),
  resource_templates: z.array(z.unknown()).default([]),
  tools: z.array(McpToolSchema).default([]),
});

/**
 * MCPサーバーの設定
 */
const McpServerConfigSchema = z
  .object({
    command: z.string().optional(),
    args: z.array(z.string()).default([]),
    type: z.string().optional(),
    env: z.record(z.string()).nullish().default({}),
  })
  .nullish();

/**
 * 生のMCPサーバー情報
 */
const RawMcpServerSchema = z.object({
  name: z.string(),
  server: McpServerConfigSchema.nullish(),
  signature: McpServerSignatureSchema.nullish(),
  started: z.boolean().nullish().default(false),
});

/**
 * Toxic Flow参照
 */
const ToxicFlowReferenceSchema = z.object({
  reference: z.tuple([z.number(), z.number()]),
  label_value: z.number().nullish(),
});

/**
 * 生の問題情報
 */
const RawIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  reference: z.tuple([z.number(), z.number()]).nullish(),
  extra_data: z
    .object({
      untrusted_content_tool: z.array(ToxicFlowReferenceSchema).nullish(),
      private_data_tool: z.array(ToxicFlowReferenceSchema).nullish(),
      public_sink_tool: z.array(ToxicFlowReferenceSchema).nullish(),
      destructive_tool: z.array(ToxicFlowReferenceSchema).nullish(),
    })
    .nullish(),
});

/**
 * mcp-scanの生のJSON出力
 */
const RawMcpScanOutputSchema = z.object({
  path: z.string(),
  servers: z.array(RawMcpServerSchema).default([]),
  issues: z.array(RawIssueSchema).default([]),
});

// ========================================
// 整形されたデータ構造のスキーマ
// ========================================

/**
 * ツールカテゴリ
 */
export const ToolCategorySchema = z.enum([
  "untrusted_content",
  "private_data",
  "public_sink",
  "destructive",
]);

/**
 * リスクレベル
 */
export const RiskLevelSchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "safe",
]);

/**
 * ツールの問題
 */
export const ToolIssueSchema = z.object({
  code: z.string(),
  severity: RiskLevelSchema,
  message: z.string(),
  suggestion: z.string().optional(),
});

/**
 * ツール分析結果
 */
export const ToolAnalysisSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  category: ToolCategorySchema.or(z.literal("safe")).default("safe"),
  issues: z.array(ToolIssueSchema).default([]),
  annotations: z
    .object({
      readOnlyHint: z.boolean().optional(),
      destructiveHint: z.boolean().optional(),
      openWorldHint: z.boolean().optional(),
    })
    .optional(),
});

/**
 * サーバーの問題
 */
export const ServerIssueSchema = z.object({
  code: z.string(),
  severity: RiskLevelSchema,
  message: z.string(),
});

/**
 * サーバー分析結果
 */
export const McpServerAnalysisSchema = z.object({
  name: z.string(),
  status: z.enum(["started", "failed", "unknown"]),
  toolCount: z.number(),
  issues: z.array(ServerIssueSchema).default([]),
  tools: z.array(ToolAnalysisSchema).default([]),
  riskLevel: RiskLevelSchema,
});

/**
 * ツール参照
 */
export const ToolReferenceSchema = z.object({
  serverName: z.string(),
  toolName: z.string(),
  riskLevel: z.enum(["high", "medium", "low"]),
});

/**
 * Toxic Flow情報
 */
export const ToxicFlowSchema = z.object({
  code: z.string(),
  type: z.enum(["data_leak", "destructive", "other"]),
  severity: RiskLevelSchema,
  message: z.string(),
  affectedServers: z.array(z.string()).default([]),
  toolReferences: z.array(ToolReferenceSchema).default([]),
  mitigation: z.string().optional(),
});

/**
 * スキャンサマリー
 */
export const McpScanSummarySchema = z.object({
  totalServers: z.number(),
  serversStarted: z.number(),
  serversFailed: z.number(),
  totalTools: z.number(),
  toolsWithIssues: z.number(),
  criticalIssues: z.number(),
  warnings: z.number(),
  toxicFlowsDetected: z.number(),
});

/**
 * MCPスキャン結果
 */
export const McpScanResultSchema = z.object({
  success: z.boolean(),
  summary: McpScanSummarySchema,
  servers: z.array(McpServerAnalysisSchema).default([]),
  toxicFlows: z.array(ToxicFlowSchema).default([]),
  error: z.string().optional(),
});

// 型定義のエクスポート
export type ToolCategory = z.infer<typeof ToolCategorySchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ToolIssue = z.infer<typeof ToolIssueSchema>;
export type ToolAnalysis = z.infer<typeof ToolAnalysisSchema>;
export type ServerIssue = z.infer<typeof ServerIssueSchema>;
export type McpServerAnalysis = z.infer<typeof McpServerAnalysisSchema>;
export type ToolReference = z.infer<typeof ToolReferenceSchema>;
export type ToxicFlow = z.infer<typeof ToxicFlowSchema>;
export type McpScanSummary = z.infer<typeof McpScanSummarySchema>;
export type McpScanResult = z.infer<typeof McpScanResultSchema>;

/**
 * 問題コードから重要度を判定
 */
const getSeverityFromCode = (code: string): RiskLevel => {
  // 例: E001 - エラーメッセージ
  if (code.startsWith("E")) return "high";
  // 例: W001 - "Tool description contains dangerous words that could be used for prompt
  if (code.startsWith("W")) return "medium";
  // Toxic Flow は低レベル（情報提供）
  if (code.startsWith("TF")) return "low";
  return "low";
};

/**
 * ツールカテゴリの判定
 */
const determineToolCategories = (
  serverIndex: number,
  toolIndex: number,
  issues: z.infer<typeof RawIssueSchema>[],
): ToolCategory[] => {
  const categories = new Set<ToolCategory>();

  for (const issue of issues) {
    if (issue.extra_data) {
      const extraData = issue.extra_data;

      if (
        extraData.untrusted_content_tool?.some(
          (ref) =>
            ref.reference[0] === serverIndex && ref.reference[1] === toolIndex,
        )
      ) {
        categories.add("untrusted_content");
      }

      if (
        extraData.private_data_tool?.some(
          (ref) =>
            ref.reference[0] === serverIndex && ref.reference[1] === toolIndex,
        )
      ) {
        categories.add("private_data");
      }

      if (
        extraData.public_sink_tool?.some(
          (ref) =>
            ref.reference[0] === serverIndex && ref.reference[1] === toolIndex,
        )
      ) {
        categories.add("public_sink");
      }

      if (
        extraData.destructive_tool?.some(
          (ref) =>
            ref.reference[0] === serverIndex && ref.reference[1] === toolIndex,
        )
      ) {
        categories.add("destructive");
      }
    }
  }

  return Array.from(categories);
};

/**
 * 生のスキャン結果を整形されたデータ構造に変換
 */
const transformRawScanOutput = (
  rawOutput: z.infer<typeof RawMcpScanOutputSchema>,
): McpScanResult => {
  const servers: McpServerAnalysis[] = [];
  const toxicFlows: ToxicFlow[] = [];

  // サマリー統計の初期化
  let totalTools = 0;
  let toolsWithIssues = 0;
  let criticalIssues = 0;
  let warnings = 0;
  let serversStarted = 0;
  let serversFailed = 0;

  // サーバーごとの分析
  rawOutput.servers.forEach((rawServer, serverIndex) => {
    const serverIssues: ServerIssue[] = [];
    const toolAnalyses: ToolAnalysis[] = [];
    let serverRiskLevel: RiskLevel = "safe";

    // startedフィールドの判定（nullやundefinedの場合はfalseとして扱う）
    const isStarted = rawServer.started === true;

    if (isStarted) {
      serversStarted++;
    } else {
      serversFailed++;
      serverRiskLevel = "medium";
    }

    // ツールごとの分析
    const tools = rawServer.signature?.tools ?? [];
    totalTools += tools.length;

    tools.forEach((tool, toolIndex) => {
      const toolIssues: ToolIssue[] = [];
      const categories = determineToolCategories(
        serverIndex,
        toolIndex,
        rawOutput.issues,
      );

      // このツールに関する問題を収集
      rawOutput.issues.forEach((issue) => {
        if (
          issue.reference &&
          issue.reference[0] === serverIndex &&
          issue.reference[1] === toolIndex
        ) {
          const severity = getSeverityFromCode(issue.code);

          toolIssues.push({
            code: issue.code,
            severity,
            message: issue.message,
            suggestion:
              issue.code === "W001"
                ? "ツールの説明文を見直し、プロンプトインジェクションを誘発する可能性のある文言を修正してください"
                : undefined,
          });

          if (severity === "critical") criticalIssues++;
          if (severity === "medium") warnings++;
        }
      });

      if (toolIssues.length > 0) {
        toolsWithIssues++;
      }

      // ツール分析結果を作成
      const toolAnalysis: ToolAnalysis = {
        name: tool.name,
        description: tool.description ?? "",
        category: categories[0] ?? "safe",
        issues: toolIssues,
        annotations: tool.annotations
          ? {
              readOnlyHint: tool.annotations.readOnlyHint ?? undefined,
              destructiveHint: tool.annotations.destructiveHint ?? undefined,
              openWorldHint: tool.annotations.openWorldHint ?? undefined,
            }
          : undefined,
      };

      toolAnalyses.push(toolAnalysis);

      // サーバーのリスクレベルを更新
      const hasHighSeverity = toolIssues.some(
        (i) => i.severity === "critical" || i.severity === "high",
      );
      const hasWarningSeverity = toolIssues.some(
        (i) => i.severity === "medium" || i.severity === "low",
      );

      if (
        hasHighSeverity &&
        (serverRiskLevel === "safe" || serverRiskLevel === "low")
      ) {
        serverRiskLevel = "high";
      } else if (hasWarningSeverity && serverRiskLevel === "safe") {
        serverRiskLevel = "medium";
      }
    });

    // サーバー分析結果を作成
    servers.push({
      name: rawServer.name,
      status: isStarted ? "started" : "failed",
      toolCount: tools.length,
      issues: serverIssues,
      tools: toolAnalyses,
      riskLevel: serverRiskLevel,
    });
  });

  // Toxic Flowの処理
  rawOutput.issues.forEach((issue) => {
    if (issue.code.startsWith("TF") && issue.extra_data) {
      const affectedServers = new Set<string>();
      const toolReferences: ToolReference[] = [];

      // 各カテゴリのツールを収集
      const processReferences = (
        refs: typeof issue.extra_data.untrusted_content_tool,
      ) => {
        if (!refs) return;

        refs.forEach((ref) => {
          const server = rawOutput.servers[ref.reference[0]];
          const tool = server?.signature?.tools[ref.reference[1]];
          if (server && tool) {
            affectedServers.add(server.name);
            toolReferences.push({
              serverName: server.name,
              toolName: tool.name,
              riskLevel:
                ref.label_value === 2
                  ? "high"
                  : ref.label_value === 1
                    ? "medium"
                    : "low",
            });
          }
        });
      };

      processReferences(issue.extra_data.untrusted_content_tool);
      processReferences(issue.extra_data.private_data_tool);
      processReferences(issue.extra_data.public_sink_tool);
      processReferences(issue.extra_data.destructive_tool);

      // Toxic Flowを作成
      toxicFlows.push({
        code: issue.code,
        type:
          issue.code === "TF001"
            ? "data_leak"
            : issue.code === "TF002"
              ? "destructive"
              : "other",
        severity: getSeverityFromCode(issue.code),
        message: issue.message,
        affectedServers: Array.from(affectedServers),
        toolReferences,
        mitigation:
          issue.code === "TF001"
            ? "データリークを防ぐため、信頼できないコンテンツを扱うツールと機密データアクセスツールを分離してください"
            : issue.code === "TF002"
              ? "破壊的操作を行うツールへのアクセスを制限し、適切な権限管理を実装してください"
              : undefined,
      });
    }
  });

  // サマリーを作成
  const summary: McpScanSummary = {
    totalServers: rawOutput.servers.length,
    serversStarted,
    serversFailed,
    totalTools,
    toolsWithIssues,
    criticalIssues,
    warnings,
    toxicFlowsDetected: toxicFlows.length,
  };

  return {
    success: true,
    summary,
    servers,
    toxicFlows,
    error: undefined,
  };
};

/**
 * MCPサーバーのセキュリティスキャンを実行（設定ファイル指定版）
 *
 * この関数は以下の処理を行います：
 * 1. 指定された設定ファイル（.mcp.jsonなど）を読み込み
 * 2. mcp-scanツール（uvx経由）を実行してセキュリティ脆弱性をチェック
 * 3. スキャン結果を解析して標準化された形式で返却
 *
 * @param configFilePath MCPサーバー設定ファイルのパス（.mcp.jsonなど）
 * @param timeout タイムアウト時間（ミリ秒）。デフォルトは60秒
 * @returns スキャン結果（成功/失敗、リスクレベル、検出された問題のリスト）
 * @throws タイムアウトやその他のエラーの場合でも、エラー情報を含む結果オブジェクトを返却
 */
export const runMcpSecurityScan = async (
  configFilePath: string,
  timeout = 60000,
): Promise<McpScanResult> => {
  try {
    // 設定ファイルの存在確認
    try {
      await readFile(configFilePath, "utf-8");
    } catch {
      return {
        success: false,
        summary: {
          totalServers: 0,
          serversStarted: 0,
          serversFailed: 0,
          totalTools: 0,
          toolsWithIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          toxicFlowsDetected: 0,
        },
        servers: [],
        toxicFlows: [],
        error: `設定ファイルが見つかりません: ${configFilePath}`,
      };
    }

    // mcp-scanを実行（JSONフォーマットで結果を取得、--full-toxic-flowsで全情報取得）
    const { stdout, stderr } = await execAsync(
      `uvx mcp-scan@latest "${configFilePath}" --json --full-toxic-flows --server-timeout 30 --suppress-mcpserver-io true`,
      { timeout },
    );

    if (stderr && !stderr.includes("warning")) {
      console.error("mcp-scan stderr:", stderr);
    }

    try {
      // JSON出力をパース
      const scanOutput: unknown = JSON.parse(stdout);

      // Zodスキーマで検証と変換
      const parsedResult = z.record(RawMcpScanOutputSchema).parse(scanOutput);
      const rawScanOutput = parsedResult[configFilePath];

      if (!rawScanOutput) {
        // スキャン結果が空の場合のデフォルト値
        return {
          success: false,
          summary: {
            totalServers: 0,
            serversStarted: 0,
            serversFailed: 0,
            totalTools: 0,
            toolsWithIssues: 0,
            criticalIssues: 0,
            warnings: 0,
            toxicFlowsDetected: 0,
          },
          servers: [],
          toxicFlows: [],
          error: "スキャン結果が取得できませんでした",
        };
      }

      // 生データを整形された構造に変換
      return transformRawScanOutput(rawScanOutput);
    } catch (parseError) {
      console.error("Parse error:", parseError);

      return {
        success: false,
        summary: {
          totalServers: 0,
          serversStarted: 0,
          serversFailed: 0,
          totalTools: 0,
          toolsWithIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          toxicFlowsDetected: 0,
        },
        servers: [],
        toxicFlows: [],
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
        summary: {
          totalServers: 0,
          serversStarted: 0,
          serversFailed: 0,
          totalTools: 0,
          toolsWithIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          toxicFlowsDetected: 0,
        },
        servers: [],
        toxicFlows: [],
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
      summary: {
        totalServers: 0,
        serversStarted: 0,
        serversFailed: 0,
        totalTools: 0,
        toolsWithIssues: 0,
        criticalIssues: 0,
        warnings: 0,
        toxicFlowsDetected: 0,
      },
      servers: [],
      toxicFlows: [],
      error: errorMessage,
    };
  }
};

/**
 * MCPサーバーのセキュリティスキャンを実行（URL/APIキー指定版）
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
export const runMcpSecurityScanWithUrl = async (
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

    // mcp-scanを実行（JSONフォーマットで結果を取得、--full-toxic-flowsで全情報取得）
    const { stdout, stderr } = await execAsync(
      `uvx mcp-scan@latest "${configFile}" --json --full-toxic-flows --server-timeout 30 --suppress-mcpserver-io true`,
      { timeout },
    );

    if (stderr && !stderr.includes("warning")) {
      console.error("mcp-scan stderr:", stderr);
    }

    try {
      // JSON出力をパース
      const scanOutput: unknown = JSON.parse(stdout);

      // Zodスキーマで検証と変換
      const parsedResult = z.record(RawMcpScanOutputSchema).parse(scanOutput);
      const rawScanOutput = parsedResult[configFile];

      if (!rawScanOutput) {
        // スキャン結果が空の場合のデフォルト値
        return {
          success: false,
          summary: {
            totalServers: 0,
            serversStarted: 0,
            serversFailed: 0,
            totalTools: 0,
            toolsWithIssues: 0,
            criticalIssues: 0,
            warnings: 0,
            toxicFlowsDetected: 0,
          },
          servers: [],
          toxicFlows: [],
          error: "スキャン結果が取得できませんでした",
        };
      }

      // 生データを整形された構造に変換
      return transformRawScanOutput(rawScanOutput);
    } catch (parseError) {
      console.error("Parse error:", parseError);

      return {
        success: false,
        summary: {
          totalServers: 0,
          serversStarted: 0,
          serversFailed: 0,
          totalTools: 0,
          toolsWithIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          toxicFlowsDetected: 0,
        },
        servers: [],
        toxicFlows: [],
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
        summary: {
          totalServers: 0,
          serversStarted: 0,
          serversFailed: 0,
          totalTools: 0,
          toolsWithIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          toxicFlowsDetected: 0,
        },
        servers: [],
        toxicFlows: [],
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
      summary: {
        totalServers: 0,
        serversStarted: 0,
        serversFailed: 0,
        totalTools: 0,
        toolsWithIssues: 0,
        criticalIssues: 0,
        warnings: 0,
        toxicFlowsDetected: 0,
      },
      servers: [],
      toxicFlows: [],
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
