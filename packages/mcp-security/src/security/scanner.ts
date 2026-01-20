import { spawn } from "child_process";
import { mkdir, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import type {
  ScanInput,
  ScanResult,
  Severity,
  Vulnerability,
  VulnerabilityType,
} from "./types.js";
import { McpScanOutputSchema } from "./types.js";

/**
 * mcp-scan のデフォルトタイムアウト（ミリ秒）
 */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * 脆弱性タイプをマッピング
 * @internal テスト用にエクスポート
 */
export const mapVulnerabilityType = (
  type: string | undefined,
): VulnerabilityType => {
  if (!type) return "unknown";

  const normalized = type.toLowerCase().replace(/[_\s-]/g, "");

  if (normalized.includes("toolpoisoning") || normalized.includes("poison")) {
    return "tool_poisoning";
  }
  if (
    normalized.includes("promptinjection") ||
    normalized.includes("injection")
  ) {
    return "prompt_injection";
  }
  if (normalized.includes("crossorigin") || normalized.includes("escalation")) {
    return "cross_origin_escalation";
  }
  if (normalized.includes("rugpull") || normalized.includes("rug")) {
    return "rug_pull";
  }

  return "unknown";
};

/**
 * 重大度をマッピング
 * @internal テスト用にエクスポート
 */
export const mapSeverity = (severity: string | undefined): Severity => {
  if (!severity) return "medium";

  const normalized = severity.toLowerCase();

  if (normalized === "critical" || normalized === "crit") {
    return "critical";
  }
  if (normalized === "high" || normalized === "h") {
    return "high";
  }
  if (normalized === "low" || normalized === "l") {
    return "low";
  }

  return "medium";
};

/**
 * リモート MCP サーバー用の一時設定ファイルを作成
 *
 * mcp-scan は MCP 設定ファイルを読み込んでスキャンするため、
 * リモートサーバーの URL を含む一時ファイルを作成する
 */
const createTempMcpConfig = async (
  input: ScanInput,
): Promise<{ configPath: string; tempDir: string }> => {
  const tempDir = join(tmpdir(), `mcp-scan-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  // リモート MCP サーバー用の設定形式
  const serverConfig: {
    url: string;
    headers?: Record<string, string>;
  } = {
    url: input.serverUrl,
  };

  // 認証ヘッダーがある場合は追加
  if (input.headers && Object.keys(input.headers).length > 0) {
    serverConfig.headers = input.headers;
  }

  const config = {
    mcpServers: {
      [input.serverName]: serverConfig,
    },
  };

  const configPath = join(tempDir, "mcp.json");
  await writeFile(configPath, JSON.stringify(config, null, 2));

  return { configPath, tempDir };
};

/**
 * 一時ファイルを削除
 */
const cleanupTempFiles = async (tempDir: string): Promise<void> => {
  try {
    const configPath = join(tempDir, "mcp.json");
    await unlink(configPath);
    // ディレクトリは空になるはずなのでそのまま
  } catch {
    // クリーンアップエラーは無視
  }
};

/**
 * mcp-scan の出力をパース
 * @internal テスト用にエクスポート
 */
export const parseMcpScanOutput = (
  output: string,
  serverName: string,
): {
  vulnerabilities: Vulnerability[];
  parseError?: string;
  serverError?: string;
} => {
  const vulnerabilities: Vulnerability[] = [];

  try {
    const parsed = JSON.parse(output) as unknown;
    const validated = McpScanOutputSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        vulnerabilities: [],
        parseError: `Invalid mcp-scan output format: ${validated.error.message}`,
      };
    }

    const data = validated.data;

    // 出力は { "/path/to/config.json": { ... } } 形式
    // 最初の設定ファイルの結果を取得
    const configResults = Object.values(data);
    if (configResults.length === 0) {
      return { vulnerabilities: [] };
    }

    const configResult = configResults[0];
    if (!configResult) {
      return { vulnerabilities: [] };
    }

    // サーバー固有のエラーをチェック
    const serverData = configResult.servers?.find((s) => s.name === serverName);

    // サーバー接続エラーがある場合
    if (serverData?.error?.is_failure) {
      return {
        vulnerabilities: [],
        serverError:
          serverData.error.message ??
          serverData.error.exception ??
          "Server connection failed",
      };
    }

    // サーバー固有の issues を処理
    const issues = serverData?.issues ?? configResult.issues ?? [];

    for (const issue of issues) {
      // W004 (registry warning) など、脆弱性ではない警告をスキップ
      if (issue.code?.startsWith("W")) {
        continue;
      }

      vulnerabilities.push({
        type: mapVulnerabilityType(issue.type),
        toolName: issue.tool ?? issue.toolName ?? "unknown",
        description: issue.description ?? issue.message ?? "No description",
        severity: mapSeverity(issue.severity),
        details: issue.details,
      });
    }

    return { vulnerabilities };
  } catch (error) {
    return {
      vulnerabilities: [],
      parseError:
        error instanceof Error
          ? `JSON parse error: ${error.message}`
          : "Unknown parse error",
    };
  }
};

/**
 * リモート MCP サーバーの脆弱性をスキャン
 *
 * mcp-scan を使用してリモート MCP サーバーに接続し、
 * ツール定義を取得して脆弱性をチェックする
 *
 * @param input スキャン対象のサーバー情報（URL と認証ヘッダー）
 * @param options オプション
 * @returns スキャン結果
 */
export const scanToolsForVulnerabilities = async (
  input: ScanInput,
  options: { timeoutMs?: number } = {},
): Promise<ScanResult> => {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let tempDir: string | undefined;

  try {
    // 一時設定ファイルを作成
    const tempFiles = await createTempMcpConfig(input);
    tempDir = tempFiles.tempDir;

    return await new Promise<ScanResult>((resolve) => {
      const proc = spawn(
        "uvx",
        ["mcp-scan@latest", tempFiles.configPath, "--json"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        resolve({
          serverName: input.serverName,
          scanTimestamp: new Date().toISOString(),
          vulnerabilities: [],
          status: "error",
          errorMessage: `Scan timeout after ${timeoutMs}ms`,
          executionTimeMs: Date.now() - startTime,
        });
      }, timeoutMs);

      proc.on("close", (code) => {
        clearTimeout(timeout);

        const executionTimeMs = Date.now() - startTime;

        // プロセスエラー
        if (code !== 0 && !stdout) {
          resolve({
            serverName: input.serverName,
            scanTimestamp: new Date().toISOString(),
            vulnerabilities: [],
            status: "error",
            errorMessage: stderr || `Process exited with code ${code}`,
            executionTimeMs,
          });
          return;
        }

        // 出力をパース
        const { vulnerabilities, parseError, serverError } = parseMcpScanOutput(
          stdout,
          input.serverName,
        );

        if (parseError) {
          resolve({
            serverName: input.serverName,
            scanTimestamp: new Date().toISOString(),
            vulnerabilities: [],
            status: "error",
            errorMessage: parseError,
            executionTimeMs,
          });
          return;
        }

        // サーバー接続エラー
        if (serverError) {
          resolve({
            serverName: input.serverName,
            scanTimestamp: new Date().toISOString(),
            vulnerabilities: [],
            status: "error",
            errorMessage: `Server connection failed: ${serverError}`,
            executionTimeMs,
          });
          return;
        }

        resolve({
          serverName: input.serverName,
          scanTimestamp: new Date().toISOString(),
          vulnerabilities,
          status: vulnerabilities.length > 0 ? "vulnerable" : "clean",
          executionTimeMs,
        });
      });

      proc.on("error", (error) => {
        clearTimeout(timeout);
        resolve({
          serverName: input.serverName,
          scanTimestamp: new Date().toISOString(),
          vulnerabilities: [],
          status: "error",
          errorMessage: `Failed to spawn mcp-scan: ${error.message}`,
          executionTimeMs: Date.now() - startTime,
        });
      });
    });
  } catch (error) {
    return {
      serverName: input.serverName,
      scanTimestamp: new Date().toISOString(),
      vulnerabilities: [],
      status: "error",
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    // クリーンアップ
    if (tempDir) {
      await cleanupTempFiles(tempDir);
    }
  }
};

/**
 * mcp-scan が利用可能かチェック
 */
export const isMcpScanAvailable = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    // mcp-scan には --version オプションがないため --help を使用
    const proc = spawn("uvx", ["mcp-scan@latest", "--help"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 30000); // uvx の初回インストールを考慮して30秒

    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
};
