import type {
  AuthType,
  McpServerConfig,
  McpToolInfo,
} from "@tumiki/mcp-proxy-core";
import { createUpstreamClient, stderrLogger } from "@tumiki/mcp-proxy-core";
import { getDb } from "../../shared/db";
import * as catalogRepository from "../catalog/catalog.repository";
import * as logger from "../../shared/utils/logger";

/**
 * 1カタログ分のツール取得結果
 */
export type FetchToolsResultItem = {
  catalogId: number;
  /// 接続成功時のみ tools[] が入る
  tools: McpToolInfo[];
  /// 接続失敗時のエラーメッセージ
  error?: string;
};

/**
 * UIから渡される入力（カタログID + 認証情報）
 * createVirtualServer の入力と同じ構造を踏襲する
 */
export type FetchToolsInputItem = {
  catalogId: number;
  credentials: Record<string, string>;
};

/**
 * Prisma AuthType → proxy AuthType マッピング
 * mcp-proxy.service.ts と同等のロジック
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
 * カタログ + 認証情報から MCP接続用の config を組み立てる
 * UIから来た情報 + DBのカタログデータを合成する
 */
const buildConfigFromCatalog = (
  catalog: {
    id: number;
    name: string;
    transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
    command: string | null;
    args: string;
    url: string | null;
    authType: string;
  },
  credentials: Record<string, string>,
): McpServerConfig | null => {
  // 一時接続のため name は catalog 由来でユニークに
  const name = `tools-fetch-${String(catalog.id)}`;

  switch (catalog.transportType) {
    case "STDIO": {
      if (!catalog.command) return null;
      let args: string[];
      try {
        const parsed = JSON.parse(catalog.args) as unknown;
        args = Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        args = [];
      }
      return {
        name,
        transportType: "STDIO",
        command: catalog.command,
        args,
        env: credentials,
      };
    }
    case "SSE": {
      if (!catalog.url) return null;
      const authType = toProxyAuthType(catalog.authType);
      return {
        name,
        transportType: "SSE",
        url: catalog.url,
        authType,
        headers: buildHeaders(authType, credentials),
      };
    }
    case "STREAMABLE_HTTP": {
      if (!catalog.url) return null;
      const authType = toProxyAuthType(catalog.authType);
      return {
        name,
        transportType: "STREAMABLE_HTTP",
        url: catalog.url,
        authType,
        headers: buildHeaders(authType, credentials),
      };
    }
    default:
      return null;
  }
};

/**
 * 1カタログに一時接続して tools/list を取得する
 * 接続成功・失敗にかかわらず最後に必ず disconnect する
 */
const fetchToolsForOne = async (
  input: FetchToolsInputItem,
): Promise<FetchToolsResultItem> => {
  const db = await getDb();
  const catalog = await catalogRepository.findById(db, input.catalogId);
  if (!catalog) {
    return {
      catalogId: input.catalogId,
      tools: [],
      error: `カタログ(id=${String(input.catalogId)})が見つかりません`,
    };
  }
  if (catalog.authType === "OAUTH") {
    return {
      catalogId: input.catalogId,
      tools: [],
      error: `OAuth認証のカタログ「${catalog.name}」はツール取得対象外です`,
    };
  }

  const config = buildConfigFromCatalog(catalog, input.credentials);
  if (!config) {
    return {
      catalogId: input.catalogId,
      tools: [],
      error: `カタログ「${catalog.name}」の接続設定が不完全です`,
    };
  }

  const client = createUpstreamClient(config, stderrLogger);
  try {
    await client.connect();
    const tools = await client.listTools();
    return {
      catalogId: input.catalogId,
      tools,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`カタログ「${catalog.name}」へのツール取得接続に失敗しました`, {
      error: message,
    });
    return {
      catalogId: input.catalogId,
      tools: [],
      error: message,
    };
  } finally {
    await client.disconnect().catch(() => {
      // disconnect失敗は無視（既に切断済みなど）
    });
  }
};

/**
 * 複数カタログのツール一覧を並列取得する
 * 1件の失敗が他に波及しないよう Promise.allSettled で実装
 */
export const fetchToolsForCatalogs = async (
  inputs: FetchToolsInputItem[],
): Promise<FetchToolsResultItem[]> => {
  const results = await Promise.allSettled(inputs.map(fetchToolsForOne));
  return results.map((result, idx) => {
    if (result.status === "fulfilled") return result.value;
    const message =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return {
      catalogId: inputs[idx]?.catalogId ?? -1,
      tools: [],
      error: message,
    };
  });
};
