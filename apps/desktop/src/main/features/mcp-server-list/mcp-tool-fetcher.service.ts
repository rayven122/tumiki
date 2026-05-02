import type {
  AuthType,
  McpServerConfig,
  McpToolInfo,
} from "@tumiki/mcp-core-proxy";
import { createUpstreamClient, stderrLogger } from "@tumiki/mcp-core-proxy";
import { getDb } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as logger from "../../shared/utils/logger";
import { decryptCredentials } from "../../utils/credentials";
import {
  buildChildEnv,
  resolveArgs,
  resolveValue,
} from "../../runtime/path-resolver";

/**
 * 1コネクタ分のツール取得結果
 */
export type FetchToolsResultItem = {
  connectionId: number;
  // 接続成功時のみ tools[] が入る
  tools: McpToolInfo[];
  // 接続失敗時のエラーメッセージ
  error?: string;
};

/**
 * findConnectionsByIds の戻り値要素型
 */
type SourceConnection = Awaited<
  ReturnType<typeof mcpRepository.findConnectionsByIds>
>[number];

/**
 * Prisma AuthType → proxy AuthType マッピング
 * mcp-proxy.service.ts と同等のロジック（OAuth は対象外なので NONE 扱い）
 */
const toProxyAuthType = (prismaAuthType: string): AuthType => {
  if (prismaAuthType === "BEARER") return "BEARER";
  if (prismaAuthType === "API_KEY") return "API_KEY";
  return "NONE";
};

/**
 * 認証ヘッダーを組み立て（HTTP系トランスポート用）
 */
const buildHeaders = (
  authType: AuthType,
  credentials: Record<string, string>,
): Record<string, string> => {
  switch (authType) {
    case "BEARER": {
      const token = credentials["token"] ?? credentials["accessToken"] ?? "";
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    case "API_KEY":
      return { ...credentials };
    case "NONE":
    default:
      return {};
  }
};

/**
 * STDIO の args（JSON文字列）を string[] にパース
 */
const parseStdioArgs = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

/**
 * 共通のエラー応答を生成（呼び出し箇所のボイラープレート削減）
 */
const errorResult = (
  connectionId: number,
  error: string,
): FetchToolsResultItem => ({ connectionId, tools: [], error });

/**
 * 既存コネクタ + 復号済み認証情報から MCP接続用の config を組み立てる
 * mcp-proxy.service.ts の buildConfigFromConnection と同等だが、OAuth リフレッシュは行わない
 * （仮想MCP作成画面では OAuth コネクタを選択不可なので不要）
 */
const buildConfigFromSourceConnection = (
  source: SourceConnection,
  credentials: Record<string, string>,
): McpServerConfig | null => {
  // 一時接続のため name は connection 由来でユニークに
  const name = `tools-fetch-${String(source.id)}`;
  const proxyAuthType = toProxyAuthType(source.authType);

  switch (source.transportType) {
    case "STDIO": {
      if (!source.command) return null;
      return {
        name,
        transportType: "STDIO",
        // バンドル済みランタイム（Node.js / uv）を解決して、ユーザーPCに npx / uvx が無くても起動できるようにする
        command: resolveValue(source.command),
        args: resolveArgs(parseStdioArgs(source.args)),
        env: buildChildEnv(process.env, credentials),
      };
    }
    case "SSE": {
      if (!source.url) return null;
      return {
        name,
        transportType: "SSE",
        url: source.url,
        authType: proxyAuthType,
        headers: buildHeaders(proxyAuthType, credentials),
      };
    }
    case "STREAMABLE_HTTP": {
      if (!source.url) return null;
      return {
        name,
        transportType: "STREAMABLE_HTTP",
        url: source.url,
        authType: proxyAuthType,
        headers: buildHeaders(proxyAuthType, credentials),
      };
    }
    default:
      return null;
  }
};

/**
 * 1コネクタに一時接続して tools/list を取得する
 * 接続成功・失敗にかかわらず最後に必ず disconnect する
 */
const fetchToolsForOne = async (
  source: SourceConnection,
): Promise<FetchToolsResultItem> => {
  if (source.authType === "OAUTH") {
    return errorResult(
      source.id,
      `OAuth認証のコネクタ「${source.name}」はツール取得対象外です`,
    );
  }

  // credentials は DB 上で暗号化済みのため復号して env / header に展開する
  let credentials: Record<string, string>;
  try {
    const plain = await decryptCredentials(source.credentials);
    const parsed = JSON.parse(plain) as unknown;
    credentials =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, string>)
        : {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(
      source.id,
      `コネクタ「${source.name}」の認証情報を読み込めませんでした: ${message}`,
    );
  }

  const config = buildConfigFromSourceConnection(source, credentials);
  if (!config) {
    return errorResult(
      source.id,
      `コネクタ「${source.name}」の接続設定が不完全です`,
    );
  }

  const client = createUpstreamClient(config, stderrLogger);
  try {
    await client.connect();
    const tools = await client.listTools();
    return { connectionId: source.id, tools };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`コネクタ「${source.name}」へのツール取得接続に失敗しました`, {
      error: message,
    });
    return errorResult(source.id, message);
  } finally {
    await client.disconnect().catch(() => {
      // disconnect失敗は無視（既に切断済みなど）
    });
  }
};

/**
 * 複数コネクタのツール一覧を並列取得する
 * 1件の失敗が他に波及しないよう Promise.allSettled で実装
 */
export const fetchToolsForConnections = async (
  connectionIds: number[],
): Promise<FetchToolsResultItem[]> => {
  if (connectionIds.length === 0) return [];

  const db = await getDb();
  const sourceConnections = await mcpRepository.findConnectionsByIds(
    db,
    connectionIds,
  );
  const sourceById = new Map(sourceConnections.map((c) => [c.id, c]));

  // 入力順を維持して結果を返す（UI側のリスト順序を保つ）
  const results = await Promise.allSettled(
    connectionIds.map(async (id) => {
      const source = sourceById.get(id);
      if (!source) {
        return errorResult(id, `コネクタ(id=${String(id)})が見つかりません`);
      }
      return fetchToolsForOne(source);
    }),
  );

  return results.map((result, idx) => {
    if (result.status === "fulfilled") return result.value;
    const message =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return errorResult(connectionIds[idx] ?? -1, message);
  });
};
