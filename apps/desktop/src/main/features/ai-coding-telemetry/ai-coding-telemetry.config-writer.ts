import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import * as logger from "../../shared/utils/logger";
import type {
  AiCodingTool,
  ApplyToolSettingsResult,
} from "./ai-coding-telemetry.types";

// Claude Code のユーザー設定ファイルパス（env セクションで環境変数を定義できる）
const CLAUDE_CODE_SETTINGS_PATH = path.join(
  os.homedir(),
  ".claude",
  "settings.json",
);

// Codex CLI の設定ファイルパス
const CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");

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

// Claude Code の settings.json に OTLP env vars を書き込む
const applyToClaudeCode = async (
  port: number,
): Promise<ApplyToolSettingsResult> => {
  const configPath = CLAUDE_CODE_SETTINGS_PATH;
  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    // 既存ファイルを読み込む（なければ空オブジェクト）
    let existing: Record<string, unknown> = {};
    const content = await fs.readFile(configPath, "utf-8").catch((error) => {
      if (isFileNotFoundError(error)) return undefined;
      throw error;
    });
    if (content !== undefined) {
      const parsed: unknown = JSON.parse(content);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error("Claude Code settings must be a JSON object");
      existing = parsed as Record<string, unknown>;
    }

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
    return { success: true, configPath };
  } catch (error) {
    logger.warn("Claude Code テレメトリ設定ファイルの更新に失敗しました", {
      configPath,
      error,
    });
    return { success: false, configPath, errorCode: "WRITE_FAILED" };
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
      const parsed: unknown = parseToml(content);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error("Codex config must be a TOML object");
      existing = parsed as Record<string, unknown>;
    }

    // 既存の telemetry セクションをマージする
    const existingTelemetry =
      typeof existing.telemetry === "object" && existing.telemetry !== null
        ? (existing.telemetry as Record<string, unknown>)
        : {};

    const merged = {
      ...existing,
      telemetry: {
        ...existingTelemetry,
        otel_exporter_otlp_endpoint: `http://127.0.0.1:${port}`,
      },
    };

    await writeAtomic(configPath, stringifyToml(merged) + "\n");
    return { success: true, configPath };
  } catch (error) {
    logger.warn("Codex テレメトリ設定ファイルの更新に失敗しました", {
      configPath,
      error,
    });
    return { success: false, configPath, errorCode: "WRITE_FAILED" };
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
