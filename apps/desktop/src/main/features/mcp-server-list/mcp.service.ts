import { ServerStatus } from "@prisma/desktop-client";
import { getDb } from "../../shared/db";
import type { DbClient } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as catalogRepository from "../catalog/catalog.repository";
import * as mcpProxyService from "../mcp-proxy/mcp-proxy.service";
import * as logger from "../../shared/utils/logger";
import { toSlug, generateRandomSuffix } from "../../../shared/mcp.slug";
import {
  SLUG_FALLBACK_PREFIX,
  VIRTUAL_SERVER_MAX_CONNECTIONS,
} from "../../../shared/mcp.constants";
import { FILESYSTEM_STDIO_NAME } from "../../../shared/catalog.constants";
import { encryptToken } from "../../utils/encryption";
import { decryptCredentials } from "../../utils/credentials";
import type {
  CreateFromCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
} from "./mcp.types";

// IPC / テストから参照できるよう re-export
export type {
  CreateFromCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
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
 * 登録直後の接続から `tools/list` を取得して `McpTool` テーブルへ保存する。
 *
 * いずれの失敗もサーバー登録自体は成功扱いとし呼び出し元へ伝播させない方針だが、
 * ログレベルは原因によって分ける:
 * - MCP接続/取得失敗（外部依存・再現性なしも多い）→ warn
 * - DB書き込み失敗（システム側の深刻な問題の可能性あり）→ error
 */
const fetchAndStoreToolsForConnection = async (
  connectionId: number,
): Promise<void> => {
  let tools;
  try {
    tools = await mcpProxyService.fetchToolsForConnection(connectionId);
  } catch (error) {
    logger.warn(
      `Connection(id=${String(connectionId)}): ツール取得に失敗しました（接続自体は登録済み）`,
      { error: error instanceof Error ? error.message : String(error) },
    );
    return;
  }

  if (tools.length === 0) {
    logger.info(
      `Connection(id=${String(connectionId)}): ツール 0件のため保存をスキップ`,
    );
    return;
  }

  try {
    const db = await getDb();
    await mcpRepository.createTools(
      db,
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: JSON.stringify(tool.inputSchema ?? {}),
        connectionId,
      })),
    );
    logger.info(
      `Connection(id=${String(connectionId)}): ツール${String(tools.length)}件を保存しました`,
    );
  } catch (error) {
    logger.error(
      `Connection(id=${String(connectionId)}): ツールのDB書き込みに失敗しました（接続自体は登録済み）`,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
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
  const connection = await mcpRepository.createConnection(db, {
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

  // 登録直後にツール一覧を取得して保存（失敗しても登録自体は成功扱い）
  await fetchAndStoreToolsForConnection(connection.id);

  return { serverId: server.id, serverName: uniqueName };
};

/**
 * カスタムURLでリモートMCPサーバーを登録（カタログ参照なし）
 */
export const createCustomServer = async (
  input: CreateCustomServerInput,
): Promise<{ serverId: number; serverName: string }> => {
  const db = await getDb();
  const uniqueName = await generateUniqueName(db, input.serverName);
  const slug = await generateUniqueSlug(db, uniqueName);

  const server = await mcpRepository.createServer(db, {
    name: uniqueName,
    slug,
    description: "",
  });

  const connection = await mcpRepository.createConnection(db, {
    name: uniqueName,
    slug,
    transportType: input.transportType,
    command: null,
    args: "[]",
    url: input.url,
    credentials: await encryptToken(JSON.stringify(input.credentials)),
    authType: input.authType,
    serverId: server.id,
    catalogId: null,
  });

  logger.info(`Custom MCP server created: ${uniqueName}`);

  await fetchAndStoreToolsForConnection(connection.id);

  return { serverId: server.id, serverName: uniqueName };
};

/**
 * 仮想MCPサーバーを作成
 * 1つのMcpServerに対して複数のMcpConnection（カタログ参照）を1トランザクションで登録する。
 *
 * - 接続0件は不正入力として拒否（最低1接続必須）
 * - OAuth認証のカタログは現状サポート外（OAuthはAddMcpModalの専用フローを利用）
 * - 各接続のslugはサーバー内で一意（カタログ名 + 必要に応じてサフィックス）
 *
 * SQLiteの$transactionタイムアウト回避のため、書き込み以外（カタログ取得・OAuth拒否チェック・
 * slug計算・暗号化）は全てtx外で先に実行し、tx内には書き込みI/Oだけを残す
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

  // カタログ取得・バリデーションを並列実行
  // 並列なので1件目失敗でも他の取得自体はキャンセルされないが、Promise.allが即rejectされるため
  // 後段の暗号化（CPU/IO重）は実行されない＝バリデーション失敗時のコストを最小化できる
  const usedConnectionSlugs = new Set<string>();
  const enrichedConnections = await Promise.all(
    input.connections.map(async (connection, index) => {
      const catalog = await catalogRepository.findById(
        db,
        connection.catalogId,
      );
      if (!catalog) {
        throw new Error(
          `カタログ(id=${String(connection.catalogId)})が見つかりません`,
        );
      }
      if (catalog.authType === "OAUTH") {
        throw new Error(
          `OAuth認証のカタログ「${catalog.name}」は仮想MCP作成では未対応です`,
        );
      }
      // Filesystem STDIOはアクセス許可ディレクトリのargs指定UIが仮想MCP作成画面に未実装のため未対応
      // （単体作成フローのAddMcpModalにはdirectoryPath入力UIがある）
      if (catalog.name === FILESYSTEM_STDIO_NAME) {
        throw new Error(
          `「${catalog.name}」は仮想MCP作成では未対応です（単体作成をご利用ください）`,
        );
      }
      return { catalog, index };
    }),
  );

  // バリデーション通過後に暗号化（CPU/IO重）をtx外で実行（SQLiteタイムアウト回避）
  const encryptedCredentialsList = await Promise.all(
    input.connections.map((conn) =>
      encryptToken(JSON.stringify(conn.credentials)),
    ),
  );

  // 接続slugを入力順で確定（Promise.allの結果はindex順を保証しているため決定論的）
  const connectionsWithSlug = enrichedConnections.map(({ catalog, index }) => {
    const baseSlug = toSlug(catalog.name) || generateFallbackSlug();
    let connectionSlug = baseSlug;
    let counter = 1;
    while (usedConnectionSlugs.has(connectionSlug)) {
      connectionSlug = `${baseSlug}-${String(counter)}`;
      counter++;
    }
    usedConnectionSlugs.add(connectionSlug);
    return { catalog, index, connectionSlug };
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

    const connectionIds: number[] = [];
    for (const { catalog, index, connectionSlug } of connectionsWithSlug) {
      const connection = await mcpRepository.createConnection(tx, {
        name: catalog.name,
        slug: connectionSlug,
        transportType: catalog.transportType,
        command: catalog.command,
        args: catalog.args,
        url: catalog.url,
        // Promise.allのindex対応により実質undefinedにならないが、型ガードのためfallbackはスキーマdefaultと揃える
        credentials: encryptedCredentialsList[index] ?? "{}",
        authType: catalog.authType,
        serverId: server.id,
        catalogId: catalog.id,
        displayOrder: index,
      });
      connectionIds.push(connection.id);
    }

    return { serverId: server.id, serverName: uniqueName, connectionIds };
  });

  logger.info(
    `Virtual MCP server created: ${result.serverName} (${String(input.connections.length)} connections)`,
  );

  // tx commit 後に各接続のツール一覧を取得・保存（並列、失敗しても登録自体は成功扱い）
  await Promise.all(
    result.connectionIds.map((id) => fetchAndStoreToolsForConnection(id)),
  );

  return { serverId: result.serverId, serverName: result.serverName };
};

/**
 * 登録済みMCPサーバー一覧を取得
 * 接続ごとに Prisma の `_count.tools` を平坦化した `toolCount` を付与する
 */
export const getAllServers = async () => {
  const db = await getDb();
  const servers = await mcpRepository.findAllWithConnections(db);
  return Promise.all(
    servers.map(async (server) => ({
      ...server,
      connections: await Promise.all(
        server.connections.map(async (conn) => {
          const { _count, ...rest } = conn;
          return {
            ...rest,
            credentials: conn.credentials
              ? await decryptCredentials(conn.credentials)
              : conn.credentials,
            toolCount: _count.tools,
          };
        }),
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
