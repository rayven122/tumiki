import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applyEdits,
  modify,
  parse as parseJsonc,
  type ParseError,
} from "jsonc-parser";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import * as logger from "../../shared/utils/logger";
import {
  resolveConfigPath,
  type SupportedAiClientId,
} from "./resolve-config-path";
import type {
  AiClientPreview,
  AiClientWriteRequest,
  AiClientWriteResult,
  AiClientWriteErrorCode,
  McpEntry,
} from "./ai-client.types";

type ConfigFileFormat = "json" | "jsonc" | "toml";

export class AiClientWriteError extends Error {
  constructor(
    public code: AiClientWriteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiClientWriteError";
  }
}

// クライアントごとに MCP サーバーを格納するキー名が異なる
// （VS Code: `servers` / Zed: `context_servers` / Codex CLI: `mcp_servers` / 他: `mcpServers`）
const CLIENT_MCP_SERVERS_KEY: Record<SupportedAiClientId, string> = {
  "claude-desktop": "mcpServers",
  "claude-code": "mcpServers",
  cursor: "mcpServers",
  windsurf: "mcpServers",
  cline: "mcpServers",
  "roo-code": "mcpServers",
  "gemini-cli": "mcpServers",
  vscode: "servers",
  zed: "context_servers",
  "codex-cli": "mcp_servers",
};

// 設定ファイルのフォーマット。JSONC は jsonc-parser、TOML は smol-toml で読み書きする
const CLIENT_FILE_FORMAT: Record<SupportedAiClientId, ConfigFileFormat> = {
  "claude-desktop": "json",
  "claude-code": "json",
  cursor: "json",
  windsurf: "json",
  cline: "json",
  "roo-code": "json",
  "gemini-cli": "json",
  vscode: "json",
  zed: "jsonc",
  "codex-cli": "toml",
};

const SUPPORTED_CLIENT_IDS: readonly SupportedAiClientId[] = Object.keys(
  CLIENT_MCP_SERVERS_KEY,
) as SupportedAiClientId[];

const isSupportedClientId = (id: string): id is SupportedAiClientId =>
  (SUPPORTED_CLIENT_IDS as readonly string[]).includes(id);

const formatTimestamp = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
};

// 既存ファイルを読み出す。format が "jsonc" の場合はコメント付きJSON を許容する。
// 書き戻し時のコメント保持に rawText も返す。
const readExistingConfig = async (
  configPath: string,
  format: ConfigFileFormat,
): Promise<{
  raw: Record<string, unknown>;
  existed: boolean;
  rawText: string;
}> => {
  let content: string;
  try {
    content = await fs.readFile(configPath, "utf-8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { raw: {}, existed: false, rawText: "" };
    }
    throw error;
  }

  const parsed = parseConfigContent(content, format);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AiClientWriteError(
      "INVALID_JSON",
      "設定ファイルが想定外の形式です（オブジェクトではありません）",
    );
  }
  return {
    raw: parsed as Record<string, unknown>,
    existed: true,
    rawText: content,
  };
};

const parseConfigContent = (
  content: string,
  format: ConfigFileFormat,
): unknown => {
  if (format === "jsonc") {
    const errors: ParseError[] = [];
    const parsed: unknown = parseJsonc(content, errors, {
      allowTrailingComma: true,
    });
    if (errors.length > 0) {
      throw new AiClientWriteError(
        "INVALID_JSON",
        "設定ファイルが不正なJSONC形式です",
      );
    }
    return parsed;
  }
  if (format === "toml") {
    try {
      return parseToml(content);
    } catch {
      throw new AiClientWriteError(
        "INVALID_JSON",
        "設定ファイルが不正なTOML形式です",
      );
    }
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new AiClientWriteError(
      "INVALID_JSON",
      "設定ファイルが不正なJSON形式です",
    );
  }
};

const extractExistingServerSlugs = (
  raw: Record<string, unknown>,
  mcpServersKey: string,
): string[] => {
  const wrapper = raw[mcpServersKey];
  if (typeof wrapper !== "object" || wrapper === null || Array.isArray(wrapper))
    return [];
  return Object.keys(wrapper);
};

export const getPreview = async (
  clientId: string,
): Promise<AiClientPreview> => {
  if (!isSupportedClientId(clientId)) {
    throw new AiClientWriteError(
      "UNSUPPORTED_PLATFORM",
      `クライアント ${clientId} はサポート対象外です`,
    );
  }
  const configPath = resolveConfigPath(clientId);
  if (!configPath) {
    throw new AiClientWriteError(
      "UNSUPPORTED_PLATFORM",
      `現在のOS (${process.platform}) では ${clientId} はサポートされていません`,
    );
  }
  const { raw, existed } = await readExistingConfig(
    configPath,
    CLIENT_FILE_FORMAT[clientId],
  );
  return {
    configPath,
    exists: existed,
    existingServerSlugs: extractExistingServerSlugs(
      raw,
      CLIENT_MCP_SERVERS_KEY[clientId],
    ),
  };
};

// TODO(DEV-1613 Phase 2): 古いバックアップ（.bak.*）の自動クリーンアップを実装する
// 現状は書き込み毎にタイムスタンプ付きバックアップが蓄積するため、
// 最新N件のみ保持するretention処理を追加する
const backupFile = async (configPath: string): Promise<string> => {
  const ts = formatTimestamp(new Date());
  const backupPath = `${configPath}.bak.${ts}`;
  await fs.copyFile(configPath, backupPath);
  return backupPath;
};

// JSONC (Zed 等) でコメントとフォーマットを保持しつつ MCP サーバーキーのみ書き換える
const serializeJsonc = (
  rawText: string,
  mcpServersKey: string,
  newServersValue: unknown,
): string => {
  const edits = modify(rawText, [mcpServersKey], newServersValue, {
    formattingOptions: { tabSize: 2, insertSpaces: true, eol: "\n" },
  });
  return applyEdits(rawText, edits);
};

const writeAtomic = async (
  configPath: string,
  content: string,
): Promise<void> => {
  const tmpPath = `${configPath}.tmp.${String(Date.now())}.${String(process.pid)}`;
  await fs.writeFile(tmpPath, content, "utf-8");
  try {
    await fs.rename(tmpPath, configPath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const mergeMcpServers = (
  existing: Record<string, unknown>,
  newEntries: Record<string, McpEntry>,
  removeSlugs: readonly string[],
  mcpServersKey: string,
): {
  merged: Record<string, unknown>;
  replacedSlugs: string[];
  removedSlugs: string[];
} => {
  const existingValue = existing[mcpServersKey];
  const existingServers =
    typeof existingValue === "object" &&
    existingValue !== null &&
    !Array.isArray(existingValue)
      ? (existingValue as Record<string, unknown>)
      : {};
  // 1. 既存から removeSlugs を取り除く
  const afterRemoval: Record<string, unknown> = {};
  const removedSlugs: string[] = [];
  for (const [slug, value] of Object.entries(existingServers)) {
    if (removeSlugs.includes(slug)) {
      removedSlugs.push(slug);
    } else {
      afterRemoval[slug] = value;
    }
  }
  // 2. newEntries で追加・上書き（newEntries が removeSlugs と衝突した場合は newEntries が勝つ）
  const replacedSlugs = Object.keys(newEntries).filter(
    (slug) => slug in afterRemoval,
  );
  return {
    merged: {
      ...existing,
      [mcpServersKey]: { ...afterRemoval, ...newEntries },
    },
    replacedSlugs,
    removedSlugs,
  };
};

export const writeConfig = async (
  request: AiClientWriteRequest,
): Promise<AiClientWriteResult> => {
  if (!isSupportedClientId(request.clientId)) {
    throw new AiClientWriteError(
      "UNSUPPORTED_PLATFORM",
      `クライアント ${request.clientId} はサポート対象外です`,
    );
  }
  const configPath = resolveConfigPath(request.clientId);
  if (!configPath) {
    throw new AiClientWriteError(
      "UNSUPPORTED_PLATFORM",
      `現在のOS (${process.platform}) では ${request.clientId} はサポートされていません`,
    );
  }

  // 1. ディレクトリ作成（無ければ）
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  // 2. 既存読み込み
  const format = CLIENT_FILE_FORMAT[request.clientId];
  const mcpServersKey = CLIENT_MCP_SERVERS_KEY[request.clientId];
  const { raw, existed, rawText } = await readExistingConfig(
    configPath,
    format,
  );

  // 3. 既存があればバックアップ
  let backupPath: string | null = null;
  if (existed) {
    try {
      backupPath = await backupFile(configPath);
    } catch (error) {
      logger.error("Failed to create backup", {
        configPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // 4. マージ（削除 → 追加・上書き）
  const removeSlugs = request.removeSlugs ?? [];
  const { merged, replacedSlugs, removedSlugs } = mergeMcpServers(
    raw,
    request.entries,
    removeSlugs,
    mcpServersKey,
  );

  // 5. シリアライズ。フォーマット別に書き出す。
  // - jsonc: jsonc-parser でコメント保持しながら edit
  // - toml: smol-toml で stringify（注: smol-toml はコメント保持しないため既存コメントは失われる）
  // - json: 標準 JSON.stringify
  let outputContent: string;
  if (format === "jsonc" && existed) {
    outputContent = serializeJsonc(
      rawText,
      mcpServersKey,
      merged[mcpServersKey],
    );
  } else if (format === "toml") {
    outputContent = stringifyToml(merged) + "\n";
  } else {
    outputContent = JSON.stringify(merged, null, 2) + "\n";
  }

  // 6. アトミック書き込み
  try {
    await writeAtomic(configPath, outputContent);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      // Windowsでは権限不足が EPERM として返ることがあるため EACCES と同様に扱う
      if (code === "EACCES" || code === "EPERM") {
        throw new AiClientWriteError(
          "PERMISSION_DENIED",
          "設定ファイルへの書き込み権限がありません",
        );
      }
    }
    throw error;
  }

  const requestedSlugs = Object.keys(request.entries);
  return {
    configPath,
    backupPath,
    addedCount: requestedSlugs.length - replacedSlugs.length,
    replacedCount: replacedSlugs.length,
    removedCount: removedSlugs.length,
  };
};
