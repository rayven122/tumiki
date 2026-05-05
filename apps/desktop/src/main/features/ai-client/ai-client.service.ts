import { promises as fs } from "node:fs";
import path from "node:path";
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

export class AiClientWriteError extends Error {
  constructor(
    public code: AiClientWriteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiClientWriteError";
  }
}

const SUPPORTED_CLIENT_IDS: readonly SupportedAiClientId[] = [
  "claude-desktop",
  "cursor",
];

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

// 既存ファイルから { mcpServers: { ... } } を読み出す。形が違う / 不正JSON は明示エラー
const readExistingConfig = async (
  configPath: string,
): Promise<{ raw: Record<string, unknown>; existed: boolean }> => {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new AiClientWriteError(
        "INVALID_JSON",
        "設定ファイルが想定外の形式です（オブジェクトではありません）",
      );
    }
    return { raw: parsed as Record<string, unknown>, existed: true };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { raw: {}, existed: false };
    }
    if (error instanceof AiClientWriteError) throw error;
    if (error instanceof SyntaxError) {
      throw new AiClientWriteError(
        "INVALID_JSON",
        "設定ファイルが不正なJSON形式です",
      );
    }
    throw error;
  }
};

const extractExistingServerSlugs = (raw: Record<string, unknown>): string[] => {
  const wrapper = raw.mcpServers;
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
      `クライアント ${clientId} はPhase 1ではサポート対象外です`,
    );
  }
  const configPath = resolveConfigPath(clientId);
  if (!configPath) {
    throw new AiClientWriteError(
      "UNSUPPORTED_PLATFORM",
      `現在のOS (${process.platform}) では ${clientId} はサポートされていません`,
    );
  }
  const { raw, existed } = await readExistingConfig(configPath);
  return {
    configPath,
    exists: existed,
    existingServerSlugs: extractExistingServerSlugs(raw),
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
): {
  merged: Record<string, unknown>;
  replacedSlugs: string[];
  removedSlugs: string[];
} => {
  const existingServers =
    typeof existing.mcpServers === "object" &&
    existing.mcpServers !== null &&
    !Array.isArray(existing.mcpServers)
      ? (existing.mcpServers as Record<string, unknown>)
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
      mcpServers: { ...afterRemoval, ...newEntries },
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
      `クライアント ${request.clientId} はPhase 1ではサポート対象外です`,
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
  const { raw, existed } = await readExistingConfig(configPath);

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
  );

  // 5. アトミック書き込み
  try {
    await writeAtomic(configPath, JSON.stringify(merged, null, 2) + "\n");
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
