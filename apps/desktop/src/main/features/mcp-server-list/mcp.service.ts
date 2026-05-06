import { ServerStatus, ServerType } from "@prisma/desktop-client";
import { getDb } from "../../shared/db";
import type { DbClient } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as mcpProxyService from "../mcp-proxy/mcp-proxy.service";
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
  CreateFromManagerCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  GetToolsForConnectionsInput,
  GetToolsForConnectionsResult,
} from "./mcp.types";

// IPC / テストから参照できるよう re-export
export type {
  CreateFromCatalogInput,
  CreateFromManagerCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  GetToolsForConnectionsInput,
  GetToolsForConnectionsResult,
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
  options?: { allowedToolNames?: string[] },
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
    const allowedToolNameSet = options?.allowedToolNames
      ? new Set(options.allowedToolNames)
      : null;
    await mcpRepository.createTools(
      db,
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: JSON.stringify(tool.inputSchema ?? {}),
        connectionId,
        ...(allowedToolNameSet && {
          isAllowed: allowedToolNameSet.has(tool.name),
        }),
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

// カタログからMCPサーバーを登録
export const createFromCatalog = async (
  input: CreateFromCatalogInput,
): Promise<{ serverId: number; serverName: string }> => {
  const db = await getDb();
  const uniqueName = await generateUniqueName(db, input.catalogName);
  const slug = await generateUniqueSlug(db, uniqueName);
  const encryptedCredentials = await encryptToken(
    JSON.stringify(input.credentials),
  );

  // server / secret / connection は同一トランザクションで作成し、孤立 secret を残さない
  const { serverId, connectionId } = await db.$transaction(async (tx) => {
    const server = await mcpRepository.createServer(tx, {
      name: uniqueName,
      slug,
      description: input.description,
      serverType: ServerType.OFFICIAL,
    });
    const secret = await mcpRepository.createSecret(tx, encryptedCredentials);
    const connection = await mcpRepository.createConnection(tx, {
      name: uniqueName,
      slug,
      transportType: input.transportType,
      command: input.command,
      args: input.args,
      url: input.url,
      secretId: secret.id,
      authType: input.authType,
      serverId: server.id,
      catalogId: input.catalogId,
    });
    return { serverId: server.id, connectionId: connection.id };
  });

  logger.info(`MCP server created from catalog: ${uniqueName}`);

  // 登録直後にツール一覧を取得して保存（失敗しても登録自体は成功扱い）
  await fetchAndStoreToolsForConnection(connectionId);

  return { serverId, serverName: uniqueName };
};

// Manager API のカタログレスポンスから登録（ローカル McpCatalog 参照なし → catalogId は null）
export const createFromManagerCatalog = async (
  input: CreateFromManagerCatalogInput,
): Promise<{ serverId: number; serverName: string }> => {
  if (input.status !== "available" || !input.permissions.execute) {
    throw new Error("このカタログは追加できません");
  }

  const template = input.connectionTemplate;
  const db = await getDb();
  const uniqueName = await generateUniqueName(db, input.serverName);
  const slug = await generateUniqueSlug(db, uniqueName);
  const encryptedCredentials = await encryptToken(
    JSON.stringify(input.credentials),
  );

  const { serverId, connectionId } = await db.$transaction(async (tx) => {
    const server = await mcpRepository.createServer(tx, {
      name: uniqueName,
      slug,
      description: input.description,
      serverType: ServerType.OFFICIAL,
    });
    const secret = await mcpRepository.createSecret(tx, encryptedCredentials);
    const connection = await mcpRepository.createConnection(tx, {
      name: uniqueName,
      slug,
      transportType: template.transportType,
      command: template.transportType === "STDIO" ? template.command : null,
      args: JSON.stringify(template.args),
      url: template.transportType !== "STDIO" ? template.url : null,
      secretId: secret.id,
      authType: template.authType,
      serverId: server.id,
      catalogId: null,
    });
    return { serverId: server.id, connectionId: connection.id };
  });

  logger.info(`MCP server created from manager catalog: ${uniqueName}`, {
    managerCatalogId: input.catalogId,
  });

  await fetchAndStoreToolsForConnection(connectionId, {
    allowedToolNames: input.tools
      .filter((tool) => tool.allowed)
      .map((tool) => tool.name),
  });

  return { serverId, serverName: uniqueName };
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
  const command = input.transportType === "STDIO" ? input.command : null;
  const args = input.transportType === "STDIO" ? (input.args ?? "[]") : "[]";
  const url = input.transportType !== "STDIO" ? input.url : null;
  const encryptedCredentials = await encryptToken(
    JSON.stringify(input.credentials),
  );

  const { serverId, connectionId } = await db.$transaction(async (tx) => {
    const server = await mcpRepository.createServer(tx, {
      name: uniqueName,
      slug,
      description: "",
      serverType: ServerType.OFFICIAL,
    });
    const secret = await mcpRepository.createSecret(tx, encryptedCredentials);
    const connection = await mcpRepository.createConnection(tx, {
      name: uniqueName,
      slug,
      transportType: input.transportType,
      command,
      args,
      url,
      secretId: secret.id,
      authType: input.authType,
      serverId: server.id,
      catalogId: null,
    });
    return { serverId: server.id, connectionId: connection.id };
  });

  logger.info(`Custom MCP server created: ${uniqueName}`);

  await fetchAndStoreToolsForConnection(connectionId);

  return { serverId, serverName: uniqueName };
};

// 既存コネクタを束ねる。元コネクタの secretId を共有することで credentials を単一情報源化する。
// 元コネクタ削除後も仮想MCP配下が参照を保つ限り secret は保持される（参照カウント運用）。
// SQLite $transaction タイムアウト回避のため、接続取得と slug 計算は tx 外で先行実行する。
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

  // 元コネクタを一括取得（toolsも含む）
  const sourceConnectionIds = input.connections.map((c) => c.connectionId);
  const sourceConnections = await mcpRepository.findConnectionsByIdsWithTools(
    db,
    sourceConnectionIds,
  );
  const sourceById = new Map(sourceConnections.map((c) => [c.id, c]));

  // 入力順を保ちつつ、元コネクタを引き当て + バリデーション
  const enrichedConnections = input.connections.map((connection, index) => {
    const source = sourceById.get(connection.connectionId);
    if (!source) {
      throw new Error(
        `コネクタ(id=${String(connection.connectionId)})が見つかりません`,
      );
    }
    if (!source.isEnabled) {
      throw new Error(`コネクタ「${source.name}」は無効化されています`);
    }
    // UIフィルタ後にサーバーが無効化された競合状態でも、無効サーバー配下の接続を仮想MCPへ取り込まないよう保証
    if (!source.server.isEnabled) {
      throw new Error(
        `コネクタ「${source.name}」が属するサーバーは無効化されています`,
      );
    }
    // 仮想MCP（CUSTOM）配下の接続を再ネストして取り込まないことを保証する。
    // UI でも `serverType === "OFFICIAL"` で同等のフィルタをかけているが、IPCを直接呼ぶ
    // 経路（テストや将来のAPI拡張）の防御層として残す。
    if (source.server.serverType === ServerType.CUSTOM) {
      throw new Error(
        `コネクタ「${source.name}」は仮想MCPに含まれるため、新しい仮想MCPの構成要素にできません`,
      );
    }
    return { source, input: connection, index };
  });

  // 接続 slug を入力順で確定（仮想MCP内で重複しないよう、必要に応じてサフィックス付与）
  const usedConnectionSlugs = new Set<string>();
  const connectionsWithSlug = enrichedConnections.map(
    ({ source, input: connectionInput, index }) => {
      const baseSlug = toSlug(source.name) || generateFallbackSlug();
      let connectionSlug = baseSlug;
      let counter = 1;
      while (usedConnectionSlugs.has(connectionSlug)) {
        connectionSlug = `${baseSlug}-${String(counter)}`;
        counter++;
      }
      usedConnectionSlugs.add(connectionSlug);
      return { source, input: connectionInput, index, connectionSlug };
    },
  );

  // tx 内は書き込み I/O のみ（generateUniqueName は重複時のサフィックス付与にDB参照が必要なため内側に残す）
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
      serverType: ServerType.CUSTOM,
    });

    for (const {
      source,
      input: connectionInput,
      index,
      connectionSlug,
    } of connectionsWithSlug) {
      // 元コネクタの secretId を共有する（参照カウントで secret は保持される）
      const newConnection = await mcpRepository.createConnection(tx, {
        name: source.name,
        slug: connectionSlug,
        transportType: source.transportType,
        command: source.command,
        args: source.args,
        url: source.url,
        secretId: source.secretId,
        authType: source.authType,
        serverId: server.id,
        catalogId: source.catalogId,
        displayOrder: index,
      });

      // 元コネクタの McpTool を新接続にコピー。`allowedToolNames` 指定があれば
      // その集合に含まれるツールのみ isAllowed=true とする（UI 編集の反映）。
      // 未指定なら元コネクタの isAllowed をそのまま継承する。
      if (source.tools.length > 0) {
        const allowedNameSet = connectionInput.allowedToolNames
          ? new Set(connectionInput.allowedToolNames)
          : null;
        await mcpRepository.createTools(
          tx,
          source.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            connectionId: newConnection.id,
            isAllowed: allowedNameSet
              ? allowedNameSet.has(tool.name)
              : tool.isAllowed,
          })),
        );
      }
    }

    return { serverId: server.id, serverName: uniqueName };
  });

  logger.info(
    `Virtual MCP server created: ${result.serverName} (${String(input.connections.length)} connections)`,
  );

  return { serverId: result.serverId, serverName: result.serverName };
};

/**
 * 仮想MCP作成のツール選択UI向け、選択中コネクタのツール一覧を一括取得する。
 *
 * UI は本結果を「ツール選択のデフォルト値（isAllowed）」として利用する。
 * コネクタ追加時に既に `tools/list` を取得して McpTool に保存済みのため、
 * 一時接続を張り直さずに DB のレコードをそのまま返す。
 */
export const getToolsForConnections = async (
  input: GetToolsForConnectionsInput,
): Promise<GetToolsForConnectionsResult> => {
  // IPC層のZodスキーマで connectionIds は最小1件を保証されているため、
  // 通常 IPC 経由ではここに到達しない。サービスを直接呼ぶ経路（テストや
  // 将来のAPI拡張）の防御として空配列チェックを残す。
  if (input.connectionIds.length === 0) {
    return { items: [] };
  }
  const db = await getDb();
  const connections = await mcpRepository.findConnectionsByIdsWithTools(
    db,
    input.connectionIds,
  );
  const byId = new Map(connections.map((c) => [c.id, c]));
  // 入力順を保って返す（UI のカード表示順を呼び出し側で制御できるようにする）
  const items = input.connectionIds.flatMap((id) => {
    const conn = byId.get(id);
    if (!conn) return [];
    return [
      {
        connectionId: id,
        tools: conn.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          isAllowed: tool.isAllowed,
        })),
      },
    ];
  });
  return { items };
};

// IPC 戻り値は従来どおり復号後 credentials を含める（McpSecret 経由で取得）
// 内部キー（secretId, secret, _count）は明示的に除外し、フィールドが増えても漏れない構成にする
export const getAllServers = async () => {
  const db = await getDb();
  const servers = await mcpRepository.findAllWithConnections(db);
  return Promise.all(
    servers.map(async (server) => ({
      ...server,
      connections: await Promise.all(
        server.connections.map(async (conn) => ({
          id: conn.id,
          name: conn.name,
          slug: conn.slug,
          transportType: conn.transportType,
          command: conn.command,
          args: conn.args,
          url: conn.url,
          authType: conn.authType,
          isEnabled: conn.isEnabled,
          displayOrder: conn.displayOrder,
          serverId: conn.serverId,
          catalogId: conn.catalogId,
          createdAt: conn.createdAt,
          updatedAt: conn.updatedAt,
          catalog: conn.catalog,
          credentials: await decryptCredentials(conn.secret.credentials),
          toolCount: conn._count.tools,
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

// cascade で接続削除 → 参照カウント0 の secret を後始末する一連を1トランザクションで実行
export const deleteServer = async (id: number) => {
  const db = await getDb();
  return db.$transaction(async (tx) => {
    const secretIds = Array.from(
      new Set(await mcpRepository.findSecretIdsByServerId(tx, id)),
    );
    const result = await mcpRepository.deleteServer(tx, id);
    for (const secretId of secretIds) {
      await mcpRepository.deleteSecretIfOrphaned(tx, secretId);
    }
    return result;
  });
};

/**
 * サーバーのenabled状態を切り替え
 */
export const toggleServer = async (id: number, isEnabled: boolean) => {
  const db = await getDb();
  return mcpRepository.toggleServerEnabled(db, id, isEnabled);
};

/**
 * サーバーのPIIマスキング有効状態を更新
 * UI トグル → DB 永続化のみ。実プロキシへは次回 spawn 時に DB から読み込まれて反映される。
 */
export const updateIsPiiMaskingEnabled = async (
  id: number,
  enabled: boolean,
) => {
  const db = await getDb();
  return mcpRepository.updateIsPiiMaskingEnabled(db, id, enabled);
};

/**
 * サーバーのTOON変換（レスポンス圧縮）有効状態を更新
 * UI トグル → DB 永続化のみ。実プロキシへは次回 spawn 時に DB から読み込まれて反映される。
 */
export const updateIsToonConversionEnabled = async (
  id: number,
  enabled: boolean,
) => {
  const db = await getDb();
  return mcpRepository.updateIsToonConversionEnabled(db, id, enabled);
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
