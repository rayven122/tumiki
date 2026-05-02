import { ServerStatus } from "@prisma/desktop-client";
import type { ToolPolicy } from "@tumiki/mcp-core-proxy";
import { getDb } from "../../shared/db";
import type { DbClient } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as logger from "../../shared/utils/logger";
import { toSlug, generateRandomSuffix } from "../../../shared/mcp.slug";
import {
  SLUG_FALLBACK_PREFIX,
  VIRTUAL_SERVER_MAX_CONNECTIONS,
} from "../../../shared/mcp.constants";
import { encryptToken } from "../../utils/encryption";
import { decryptCredentials } from "../../utils/credentials";
import type {
  CreateFromCatalogInput,
  CreateVirtualServerInput,
  FetchToolsInput,
  FetchToolsResult,
  VirtualServerToolInput,
} from "./mcp.types";
import { fetchToolsForConnections as fetchToolsForConnectionsImpl } from "./mcp-tool-fetcher.service";

/**
 * customDescription を「上書きあり」と判定したときだけ元の値、それ以外は undefined を返す
 * 空文字・空白のみは「上書きなし」として扱う（DB上は null 保存・読み出し時は undefined）
 */
const normalizeCustomDescription = (
  value: string | null | undefined,
): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return value.trim() === "" ? undefined : value;
};

// IPC / テストから参照できるよう re-export
export type {
  CreateFromCatalogInput,
  CreateVirtualServerInput,
  FetchToolsInput,
  FetchToolsResult,
} from "./mcp.types";

/**
 * フォールバック用slugを生成（`${SLUG_FALLBACK_PREFIX}-{乱数4文字}` 形式）
 * base36 4文字なら衝突確率は実用上ゼロのため、UI 表示と DB 実態が一致する
 */
const generateFallbackSlug = (): string =>
  `${SLUG_FALLBACK_PREFIX}-${generateRandomSuffix()}`;

/**
 * 一意なslugを生成（重複時はサフィックス付与）
 * 日本語のみの名前など toSlug() が空文字を返すケースでは乱数フォールバックを使用する
 * 連番サフィックスは衝突保険として残す（乱数衝突の極稀ケース対策）
 */
const generateUniqueSlug = async (
  db: DbClient,
  name: string,
): Promise<string> => {
  const baseSlug = toSlug(name) || generateFallbackSlug();
  let slug = baseSlug;
  let counter = 1;

  while (await mcpRepository.findServerBySlug(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/**
 * 一意なサーバー名を生成（重複時はサフィックス付与）
 */
const generateUniqueName = async (
  db: DbClient,
  name: string,
): Promise<string> => {
  let candidateName = name;
  let counter = 2;

  while (await mcpRepository.findServerByName(db, candidateName)) {
    candidateName = `${name} ${counter}`;
    counter++;
  }

  return candidateName;
};

/**
 * カタログからMCPサーバーを登録
 */
export const createFromCatalog = async (
  input: CreateFromCatalogInput,
): Promise<{ serverId: number; serverName: string }> => {
  const db = await getDb();
  const uniqueName = await generateUniqueName(db, input.catalogName);
  const slug = await generateUniqueSlug(db, uniqueName);

  // MCPサーバー作成
  const server = await mcpRepository.createServer(db, {
    name: uniqueName,
    slug,
    description: input.description,
  });

  // MCP接続作成
  await mcpRepository.createConnection(db, {
    name: uniqueName,
    slug,
    transportType: input.transportType,
    command: input.command,
    args: input.args,
    url: input.url,
    credentials: await encryptToken(JSON.stringify(input.credentials)),
    authType: input.authType,
    serverId: server.id,
    catalogId: input.catalogId,
  });

  logger.info(`MCP server created from catalog: ${uniqueName}`);

  return { serverId: server.id, serverName: uniqueName };
};

/**
 * VirtualServerToolInput を MCP DB の CreateMcpToolInput へマッピング
 * 空白のみの customDescription は null（上書きなし）として保存する
 */
const toCreateMcpToolInput = (
  tool: VirtualServerToolInput,
  connectionId: number,
): mcpRepository.CreateMcpToolInput => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  isAllowed: tool.isAllowed,
  customDescription: normalizeCustomDescription(tool.customDescription) ?? null,
  connectionId,
});

/**
 * 仮想MCPサーバーを作成
 * 1つのMcpServerに対して複数のMcpConnection（既存コネクタからのコピー）を1トランザクションで登録する。
 *
 * - 接続0件は不正入力として拒否（最低1接続必須）
 * - OAuth認証のコネクタは現状サポート外（OAuthはAddMcpModalの専用フローを利用）
 * - 各接続のslugはサーバー内で一意（コネクタ名 + 必要に応じてサフィックス）
 *
 * 既存コネクタ（McpConnection）の設定（transportType / command / args / url / 暗号化済み
 * credentials / authType / catalogId）をそのままコピーし、新しい仮想MCPサーバー配下に複製する。
 * credentials は既に暗号化済みのため復号・再暗号化は不要（暗号化blobをそのまま転送）。
 */
export const createVirtualServer = async (
  input: CreateVirtualServerInput,
): Promise<{ serverId: number; serverName: string }> => {
  if (input.connections.length === 0) {
    throw new Error("仮想MCPには1つ以上の接続が必要です");
  }
  // ドメインルールはIPC層のZodだけに依存させず、サービス層でも保証する
  if (input.connections.length > VIRTUAL_SERVER_MAX_CONNECTIONS) {
    throw new Error(
      `接続は最大${String(VIRTUAL_SERVER_MAX_CONNECTIONS)}件までです`,
    );
  }

  const db = await getDb();

  // 既存コネクタを一括取得（IDは重複してもUI上は同一カードを2回選択する想定）
  const connectionIds = input.connections.map((c) => c.connectionId);
  const sourceConnections = await mcpRepository.findConnectionsByIds(
    db,
    connectionIds,
  );
  const sourceById = new Map(sourceConnections.map((c) => [c.id, c]));

  // 入力順を維持しつつ、各接続のソース確定 + バリデーション
  const usedConnectionSlugs = new Set<string>();
  const enrichedConnections = input.connections.map((connection, index) => {
    const source = sourceById.get(connection.connectionId);
    if (!source) {
      throw new Error(
        `コネクタ(id=${String(connection.connectionId)})が見つかりません`,
      );
    }
    if (source.authType === "OAUTH") {
      throw new Error(
        `OAuth認証のコネクタ「${source.name}」は仮想MCP作成では未対応です`,
      );
    }
    // 接続slug: 元コネクタのslugを優先、衝突時はサフィックス付与
    const baseSlug = toSlug(source.name) || generateFallbackSlug();
    let connectionSlug = baseSlug;
    let counter = 1;
    while (usedConnectionSlugs.has(connectionSlug)) {
      connectionSlug = `${baseSlug}-${String(counter)}`;
      counter++;
    }
    usedConnectionSlugs.add(connectionSlug);
    return { source, index, connectionSlug };
  });

  // tx内は書き込みI/Oのみ（generateUniqueNameは重複時のサフィックス付与にDB参照が必要なため内側に残す）
  // 注意: SQLiteのinteractive transactionは他writerをロックしないため、
  // 同名サーバーが同時作成された場合は@uniqueでP2002が発生し得る。
  // Desktopアプリは単一ユーザー前提のため許容する（IPC層で汎用エラーにラップされる）
  const result = await db.$transaction(async (tx) => {
    const uniqueName = await generateUniqueName(tx, input.name);
    const serverSlug = await generateUniqueSlug(tx, uniqueName);

    const server = await mcpRepository.createServer(tx, {
      name: uniqueName,
      slug: serverSlug,
      description: input.description,
    });

    for (const { source, index, connectionSlug } of enrichedConnections) {
      // 既存コネクタの設定を新しい仮想MCP配下にコピーする
      // credentials は既に暗号化済みのため復号せずblobをそのまま再利用する
      const connection = await mcpRepository.createConnection(tx, {
        name: source.name,
        slug: connectionSlug,
        transportType: source.transportType,
        command: source.command,
        args: source.args,
        url: source.url,
        credentials: source.credentials,
        authType: source.authType,
        serverId: server.id,
        catalogId: source.catalogId,
        displayOrder: index,
      });

      // 接続単位のツール一覧が渡されている場合のみ McpTool を保存
      // 旧呼び出し（tools未指定）も後方互換で動作させるため optional 扱い
      const inputTools = input.connections[index]?.tools;
      if (inputTools && inputTools.length > 0) {
        await mcpRepository.createTools(
          tx,
          inputTools.map((t) => toCreateMcpToolInput(t, connection.id)),
        );
      }
    }

    return { serverId: server.id, serverName: uniqueName };
  });

  logger.info(
    `Virtual MCP server created: ${result.serverName} (${String(input.connections.length)} connections)`,
  );

  return result;
};

/**
 * 登録済みMCPサーバー一覧を取得
 */
export const getAllServers = async () => {
  const db = await getDb();
  const servers = await mcpRepository.findAllWithConnections(db);
  return Promise.all(
    servers.map(async (server) => ({
      ...server,
      connections: await Promise.all(
        server.connections.map(async (conn) => ({
          ...conn,
          credentials: conn.credentials
            ? await decryptCredentials(conn.credentials)
            : conn.credentials,
        })),
      ),
    })),
  );
};

/**
 * サーバー情報を更新
 */
export const updateServer = async (
  id: number,
  data: { name?: string; description?: string },
) => {
  const db = await getDb();
  return mcpRepository.updateServer(db, id, data);
};

/**
 * サーバーを削除
 */
export const deleteServer = async (id: number) => {
  const db = await getDb();
  return mcpRepository.deleteServer(db, id);
};

/**
 * サーバーのenabled状態を切り替え
 */
export const toggleServer = async (id: number, isEnabled: boolean) => {
  const db = await getDb();
  return mcpRepository.toggleServerEnabled(db, id, isEnabled);
};

/**
 * サーバーの稼働状態を更新（CLIモードからのステータス同期用）
 */
export const updateServerStatus = async (
  id: number,
  serverStatus: ServerStatus,
) => {
  const db = await getDb();
  return mcpRepository.updateServerStatus(db, id, serverStatus);
};

/**
 * 全サーバーのステータスを一括STOPPED化（シャットダウン時）
 */
export const resetAllServerStatus = async () => {
  const db = await getDb();
  return mcpRepository.updateAllServerStatus(db, ServerStatus.STOPPED);
};

/** policyMap のキー形式: `${configName}::${toolName}` */
export const toolPolicyKey = (configName: string, toolName: string): string =>
  `${configName}::${toolName}`;

/**
 * proxy 起動時に使うツール公開ポリシーマップを構築する
 * key 形式: `${configName}::${toolName}` （configName は `${serverSlug}-${connectionSlug}`）
 * value は McpTool レコードから派生した ToolPolicy
 *
 * McpTool レコードが存在しないツールは map に含まれず、proxy 側ではデフォルト動作（公開）になる。
 * これにより 1:1 (createFromCatalog) で作成された既存サーバーは挙動が変わらない。
 */
export const buildToolPolicyMap = async (
  serverSlug: string,
): Promise<Map<string, ToolPolicy>> => {
  const db = await getDb();
  const tools = await mcpRepository.findToolsByServerSlug(db, serverSlug);
  const policyMap = new Map<string, ToolPolicy>();
  for (const tool of tools) {
    const configName = `${tool.connection.server.slug}-${tool.connection.slug}`;
    policyMap.set(toolPolicyKey(configName, tool.name), {
      isAllowed: tool.isAllowed,
      customDescription: normalizeCustomDescription(tool.customDescription),
    });
  }
  return policyMap;
};

/**
 * 仮想MCP作成前に各既存コネクタのツール一覧を取得する
 * UIで「次へ」ボタンを押した時に呼ばれる前段処理
 *
 * - input: 既存McpConnection IDの配列
 * - 各接続のcredentialsを復号して一時接続し、tools/list を取得 → 切断
 * - 1件失敗しても他は続行する（Promise.allSettled）
 */
export const fetchToolsForConnections = async (
  input: FetchToolsInput,
): Promise<FetchToolsResult> => {
  const results = await fetchToolsForConnectionsImpl(input.connectionIds);
  return {
    items: results.map((r) => ({
      connectionId: r.connectionId,
      tools: r.tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: JSON.stringify(t.inputSchema ?? {}),
      })),
      error: r.error,
    })),
  };
};
