import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import * as logger from "../../shared/utils/logger";
import type {
  AiCodingTool,
  ApplyToolSettingsResult,
} from "./ai-coding-telemetry.types";
import type { McpEntry } from "../ai-client/ai-client.types";
import { ANALYTICS_RECEIVER_FLAG } from "../../app-mode";
import { ensureNodeShim, resolveValue } from "../../runtime/path-resolver";

// Claude Code のユーザー設定ファイルパス（env セクションで環境変数を定義できる）
const CLAUDE_CODE_SETTINGS_PATH = path.join(
  os.homedir(),
  ".claude",
  "settings.json",
);

const CLAUDE_CODE_MCP_CONFIG_PATH = path.join(os.homedir(), ".claude.json");

// Codex CLI の設定ファイルパス
const CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");

export const ANALYTICS_MCP_SERVER_NAME = "tumiki-analytics";

const ANALYTICS_NODE_ENTRY = "analytics-node.cjs";

const isFileNotFoundError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "ENOENT" ||
    (typeof maybeError.message === "string" &&
      maybeError.message.includes("ENOENT"))
  );
};

const isValidPort = (port: number): boolean =>
  Number.isInteger(port) && port >= 1 && port <= 65535;

const CONFIG_PARSE_ERROR_NAME = "ConfigParseError";

const createConfigParseError = (message: string): Error => {
  const error = new Error(message);
  error.name = CONFIG_PARSE_ERROR_NAME;
  return error;
};

const isConfigParseError = (error: unknown): boolean =>
  error instanceof Error && error.name === CONFIG_PARSE_ERROR_NAME;

const getAppPath = (): string => app.getAppPath();

const getAnalyticsNodeEntryPath = (): string => {
  const appPath = getAppPath();
  const appPathEntry = path.join(
    appPath,
    "dist-electron",
    "main",
    ANALYTICS_NODE_ENTRY,
  );
  if (existsSync(appPathEntry)) return appPathEntry;

  const rawAppEntry = process.argv[1];
  if (rawAppEntry) {
    return path.join(
      path.dirname(path.resolve(rawAppEntry)),
      ANALYTICS_NODE_ENTRY,
    );
  }
  return appPathEntry;
};

const getMigrationsDir = (): string => {
  const appPath = getAppPath();
  if (app.isPackaged) {
    return path.join(
      appPath.replace(/app\.asar$/, "app.asar.unpacked"),
      "prisma",
      "migrations",
    );
  }
  return path.join(appPath, "prisma", "migrations");
};

const getAnalyticsMcpEntry = (): McpEntry => {
  ensureNodeShim();
  return {
    command: resolveValue("${runtime:node}"),
    args: [getAnalyticsNodeEntryPath(), ANALYTICS_RECEIVER_FLAG],
    env: {
      TUMIKI_DESKTOP_USER_DATA_DIR: app.getPath("userData"),
      TUMIKI_DESKTOP_MIGRATIONS_DIR: getMigrationsDir(),
    },
  };
};

// 一時ファイルを使ったアトミック書き込み
const writeAtomic = async (
  filePath: string,
  content: string,
): Promise<void> => {
  const tmpPath = `${filePath}.tmp.${String(Date.now())}.${randomBytes(4).toString("hex")}`;
  await fs.writeFile(tmpPath, content, "utf-8");
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const readJsonObject = async (
  filePath: string,
): Promise<Record<string, unknown>> => {
  const content = await fs.readFile(filePath, "utf-8").catch((error) => {
    if (isFileNotFoundError(error)) return undefined;
    throw error;
  });
  if (content === undefined) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw createConfigParseError(`JSON config parse failed: ${filePath}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw createConfigParseError(`JSON config must be an object: ${filePath}`);
  }
  return parsed as Record<string, unknown>;
};

const mergeAnalyticsMcpServer = (
  existing: Record<string, unknown>,
): Record<string, unknown> => {
  const existingMcpServers =
    typeof existing.mcpServers === "object" &&
    existing.mcpServers !== null &&
    !Array.isArray(existing.mcpServers)
      ? (existing.mcpServers as Record<string, unknown>)
      : {};
  return {
    ...existing,
    mcpServers: {
      ...existingMcpServers,
      [ANALYTICS_MCP_SERVER_NAME]: getAnalyticsMcpEntry(),
    },
  };
};

// Claude Code の settings.json に OTLP env vars を書き込む
const applyToClaudeCode = async (
  port: number,
): Promise<ApplyToolSettingsResult> => {
  const configPath = CLAUDE_CODE_SETTINGS_PATH;
  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.mkdir(path.dirname(CLAUDE_CODE_MCP_CONFIG_PATH), {
      recursive: true,
    });

    // 既存ファイルを読み込む（なければ空オブジェクト）
    const existing = await readJsonObject(configPath);
    const existingMcpConfig = await readJsonObject(CLAUDE_CODE_MCP_CONFIG_PATH);

    // 既存の env キーをマージする
    const existingEnv =
      typeof existing.env === "object" &&
      existing.env !== null &&
      !Array.isArray(existing.env)
        ? (existing.env as Record<string, unknown>)
        : {};

    const merged = {
      ...existing,
      env: {
        ...existingEnv,
        CLAUDE_CODE_ENABLE_TELEMETRY: "1",
        OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${port}`,
      },
    };

    await writeAtomic(configPath, JSON.stringify(merged, null, 2) + "\n");
    await writeAtomic(
      CLAUDE_CODE_MCP_CONFIG_PATH,
      JSON.stringify(mergeAnalyticsMcpServer(existingMcpConfig), null, 2) +
        "\n",
    );
    return { success: true, configPath };
  } catch (error) {
    logger.warn("Claude Code テレメトリ設定ファイルの更新に失敗しました", {
      configPath,
      error,
    });
    return {
      success: false,
      configPath,
      errorCode: isConfigParseError(error) ? "PARSE_FAILED" : "WRITE_FAILED",
    };
  }
};

// Codex CLI の config.toml に OTLP 設定を書き込む
const applyToCodex = async (port: number): Promise<ApplyToolSettingsResult> => {
  const configPath = CODEX_CONFIG_PATH;
  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    // 既存ファイルを読み込む（なければ空オブジェクト）
    let existing: Record<string, unknown> = {};
    const content = await fs.readFile(configPath, "utf-8").catch((error) => {
      if (isFileNotFoundError(error)) return undefined;
      throw error;
    });
    if (content !== undefined) {
      let parsed: unknown;
      try {
        parsed = parseToml(content);
      } catch {
        throw createConfigParseError(`TOML config parse failed: ${configPath}`);
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw createConfigParseError(
          `Codex config must be a TOML object: ${configPath}`,
        );
      existing = parsed as Record<string, unknown>;
    }

    // 既存の telemetry セクションをマージする
    const existingTelemetry =
      typeof existing.telemetry === "object" &&
      existing.telemetry !== null &&
      !Array.isArray(existing.telemetry)
        ? (existing.telemetry as Record<string, unknown>)
        : {};
    const existingMcpServers =
      typeof existing.mcp_servers === "object" &&
      existing.mcp_servers !== null &&
      !Array.isArray(existing.mcp_servers)
        ? (existing.mcp_servers as Record<string, unknown>)
        : {};

    const merged = {
      ...existing,
      telemetry: {
        ...existingTelemetry,
        otel_exporter_otlp_endpoint: `http://127.0.0.1:${port}`,
      },
      mcp_servers: {
        ...existingMcpServers,
        [ANALYTICS_MCP_SERVER_NAME]: getAnalyticsMcpEntry(),
      },
    };

    await writeAtomic(configPath, stringifyToml(merged) + "\n");
    return { success: true, configPath };
  } catch (error) {
    logger.warn("Codex テレメトリ設定ファイルの更新に失敗しました", {
      configPath,
      error,
    });
    return {
      success: false,
      configPath,
      errorCode: isConfigParseError(error) ? "PARSE_FAILED" : "WRITE_FAILED",
    };
  }
};

// 指定ツールの設定ファイルに OTLP env vars を書き込む
export const applyOtlpToTool = async (
  tool: AiCodingTool,
  port: number,
): Promise<ApplyToolSettingsResult> => {
  if (!isValidPort(port)) {
    return {
      success: false,
      configPath: null,
      errorCode: "INVALID_PORT",
    };
  }
  if (tool === "claude-code") return applyToClaudeCode(port);
  if (tool === "codex") return applyToCodex(port);
  const exhaustive: never = tool;
  void exhaustive;
  return {
    success: false,
    configPath: null,
    errorCode: "UNSUPPORTED_PLATFORM",
  };
};
