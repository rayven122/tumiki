import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
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

// 一時ファイルを使ったアトミック書き込み
const writeAtomic = async (
  filePath: string,
  content: string,
): Promise<void> => {
  const tmpPath = `${filePath}.tmp.${String(Date.now())}.${String(process.pid)}`;
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
    try {
      const content = await fs.readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(content);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        existing = parsed as Record<string, unknown>;
      }
    } catch {
      // ファイルが存在しない場合は空オブジェクトで続行
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
  } catch {
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
    try {
      const content = await fs.readFile(configPath, "utf-8");
      existing = parseToml(content) as Record<string, unknown>;
    } catch {
      // ファイルが存在しない場合は空で続行
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
  } catch {
    return { success: false, configPath, errorCode: "WRITE_FAILED" };
  }
};

// 指定ツールの設定ファイルに OTLP env vars を書き込む
export const applyOtlpToTool = async (
  tool: AiCodingTool,
  port: number,
): Promise<ApplyToolSettingsResult> => {
  if (tool === "claude-code") return applyToClaudeCode(port);
  if (tool === "codex") return applyToCodex(port);
  return {
    success: false,
    configPath: null,
    errorCode: "UNSUPPORTED_PLATFORM",
  };
};
