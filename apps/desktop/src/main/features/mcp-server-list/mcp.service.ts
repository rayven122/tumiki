import { ServerStatus, ServerType } from "@prisma/desktop-client";
import type { McpToolInfo } from "@tumiki/mcp-core-proxy";
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
import { getFaviconUrlsFromUrl } from "../../../shared/faviconUtils";
import { encryptToken } from "../../utils/encryption";
import { decryptCredentials } from "../../utils/credentials";
import { mergeCredentials } from "./mcp.credentials";
import { CREDENTIALS_MASK_VALUE } from "../../../shared/mcp.constants";
import type {
  CreateFromCatalogInput,
  CreateFromManagerCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  GetToolsForConnectionsInput,
  GetToolsForConnectionsResult,
  GetServerEditDetailOutput,
  RefreshToolsOutput,
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
 * 取得済みの `McpToolInfo[]` を `McpTool` 行のシード形式に変換する。
 * `allowedToolNames` 指定時は集合に含まれるツールのみ `isAllowed=true`。
 *
 * 入力は `fetchToolsForConnection` / `fetchToolsForConnectionInput` どちらの戻り値でも
 * 受け取れるよう、共通の `McpToolInfo[]` 型を直接受け取る。
 */
const toToolSeeds = (
  tools: McpToolInfo[],
  connectionId: number,
  allowedToolNames?: string[],
) => {
  const allowedToolNameSet = allowedToolNames
    ? new Set(allowedToolNames)
    : null;
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: JSON.stringify(tool.inputSchema ?? {}),
    connectionId,
    ...(allowedToolNameSet && {
      isAllowed: allowedToolNameSet.has(tool.name),
    }),
  }));
};

// カタログからMCPサーバーを登録
// tools取得が成功した場合のみ server / secret / connection / tools を一括登録する。
// 失敗時は ToolFetchError を呼び出し元へ伝播し、DBへ何も書き込まない。
export const createFromCatalog = async (
  input: CreateFromCatalogInput,
): Promise<{ serverId: number; serverName: string }> => {
  const db = await getDb();
  const uniqueName = await generateUniqueName(db, input.catalogName);
  const slug = await generateUniqueSlug(db, uniqueName);

  // 登録前検証: 未永続のままtools取得を試行（失敗時はthrowしてDB書き込みを阻止）
  const tools = await mcpProxyService.fetchToolsForConnectionInput({
    name: slug,
    transportType: input.transportType,
    command: input.command,
    args: input.args,
    url: input.url,
    authType: input.authType,
    credentials: input.credentials,
  });

  const encryptedCredentials = await encryptToken(
    JSON.stringify(input.credentials),
  );

  // server / secret / connection / tools を同一トランザクションで作成し、孤立secretを残さない
  const { serverId } = await db.$transaction(async (tx) => {
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
    if (tools.length > 0) {
      await mcpRepository.createTools(tx, toToolSeeds(tools, connection.id));
    }
    return { serverId: server.id };
  });

  logger.info(
    `MCP server created from catalog: ${uniqueName} (tools=${String(tools.length)})`,
  );

  return { serverId, serverName: uniqueName };
};

// Manager API のカタログレスポンスから登録（ローカル McpCatalog 参照なし → catalogId は null）
// tools取得が成功した場合のみ一括登録する。失敗時は呼び出し元へ伝播。
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

  const command = template.transportType === "STDIO" ? template.command : null;
  const args = JSON.stringify(template.args);
  const url = template.transportType !== "STDIO" ? template.url : null;

  const tools = await mcpProxyService.fetchToolsForConnectionInput({
    name: slug,
    transportType: template.transportType,
    command,
    args,
    url,
    authType: template.authType,
    credentials: input.credentials,
  });

  const encryptedCredentials = await encryptToken(
    JSON.stringify(input.credentials),
  );
  const allowedToolNames = input.tools
    .filter((tool) => tool.allowed)
    .map((tool) => tool.name);

  const { serverId } = await db.$transaction(async (tx) => {
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
      command,
      args,
      url,
      secretId: secret.id,
      authType: template.authType,
      serverId: server.id,
      catalogId: null,
    });
    if (tools.length > 0) {
      await mcpRepository.createTools(
        tx,
        toToolSeeds(tools, connection.id, allowedToolNames),
      );
    }
    return { serverId: server.id };
  });

  logger.info(
    `MCP server created from manager catalog: ${uniqueName} (tools=${String(tools.length)})`,
    {
      managerCatalogId: input.catalogId,
    },
  );

  return { serverId, serverName: uniqueName };
};

/**
 * カスタムURLでリモートMCPサーバーを登録（カタログ参照なし）
 * tools取得が成功した場合のみ一括登録する。失敗時は呼び出し元へ伝播。
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
  // URLがある場合のみfavicon URLを生成（STDIOはURLなしのためnull）
  const iconPath = url ? (getFaviconUrlsFromUrl(url, 32)[0] ?? null) : null;

  const tools = await mcpProxyService.fetchToolsForConnectionInput({
    name: slug,
    transportType: input.transportType,
    command,
    args,
    url,
    authType: input.authType,
    credentials: input.credentials,
  });

  const encryptedCredentials = await encryptToken(
    JSON.stringify(input.credentials),
  );

  const { serverId } = await db.$transaction(async (tx) => {
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
      iconPath,
    });
    if (tools.length > 0) {
      await mcpRepository.createTools(tx, toToolSeeds(tools, connection.id));
    }
    return { serverId: server.id };
  });

  logger.info(
    `Custom MCP server created: ${uniqueName} (tools=${String(tools.length)})`,
  );

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

// 内部キー（secretId, _count）は明示的に除外し、フィールドが増えても漏れない構成にする
export const getAllServers = async () => {
  const db = await getDb();
  const servers = await mcpRepository.findAllWithConnections(db);
  return servers.map((server) => ({
    ...server,
    connections: server.connections.map((conn) => ({
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
      iconPath: conn.iconPath,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      catalog: conn.catalog,
      toolCount: conn._count.tools,
      needsReauth: conn.secret.needsReauth,
    })),
  }));
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

export const refreshTools = async (
  serverId: number,
): Promise<RefreshToolsOutput> => {
  const db = await getDb();
  const connections = await mcpRepository.findConnectionsByServerId(
    db,
    serverId,
  );
  if (connections.length === 0) {
    throw new Error("サーバーに接続がありません");
  }

  const fetchedToolsByConnection = await Promise.all(
    connections.map(async (connection) => ({
      connectionId: connection.id,
      tools: await mcpProxyService.fetchToolsForConnection(connection.id),
    })),
  );

  await db.$transaction(async (tx) => {
    for (const { connectionId, tools } of fetchedToolsByConnection) {
      await mcpRepository.syncToolsForConnection(
        tx,
        connectionId,
        tools.map((tool) => ({
          name: tool.name,
          description: tool.description ?? "",
          inputSchema: JSON.stringify(tool.inputSchema ?? {}),
        })),
      );
    }
  });

  return {
    totalTools: fetchedToolsByConnection.reduce(
      (total, item) => total + item.tools.length,
      0,
    ),
  };
};

/**
 * 暗号化済み credentials 文字列を復号して Record<string,string> に戻す。
 * 復号失敗・JSON 解析失敗時は空 Record にフォールバックし warn ログを残す
 * （apps/manager の getMcpConfig.ts と同等の許容セマンティクス）。
 */
const safeDecryptCredentialsRecord = async (
  encrypted: string,
): Promise<Record<string, string>> => {
  try {
    const decrypted = await decryptCredentials(encrypted);
    const parsed = JSON.parse(decrypted) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // 値が string でないキーは除外（破損データへの防御）
      const record: Record<string, string> = {};
      for (const [key, value] of Object.entries(
        parsed as Record<string, unknown>,
      )) {
        if (typeof value === "string") {
          record[key] = value;
        }
      }
      return record;
    }
    return {};
  } catch (error) {
    logger.warn(
      "Failed to decrypt or parse credentials, falling back to empty record",
      { error: error instanceof Error ? error.message : String(error) },
    );
    return {};
  }
};

/**
 * サーバー編集画面の初期データを取得（renderer に平文 credentials は返さない）
 */
export const getServerEditDetail = async (
  serverId: number,
): Promise<GetServerEditDetailOutput> => {
  const db = await getDb();
  const server = await mcpRepository.findServerWithConnectionsAndSecrets(
    db,
    serverId,
  );
  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  const connections = await Promise.all(
    server.connections.map(async (conn) => {
      const credentials = await safeDecryptCredentialsRecord(
        conn.secret.credentials,
      );
      return {
        id: conn.id,
        name: conn.name,
        authType: conn.authType,
        credentialKeys: Object.keys(credentials),
      };
    }),
  );

  return {
    id: server.id,
    name: server.name,
    description: server.description,
    connections,
  };
};

/**
 * 接続単位の credentials を更新
 *
 * 仮想MCPで複数 connection が同一 secretId を共有しうるため、編集対象 connection
 * 用に新規 McpSecret を作って secretId を差し替える方式を採用する。旧 secret は
 * 参照カウントが 0 になれば deleteSecretIfOrphaned で削除される。
 *
 * OAuth 接続の認証情報は本フローでは更新できない（再認証フローを使う）。
 */
export const updateServerConnectionCredentials = async (
  connectionId: number,
  inputCredentials: Record<string, string>,
) => {
  const db = await getDb();
  await db.$transaction(async (tx) => {
    const conn = await mcpRepository.findConnectionByIdWithSecret(
      tx,
      connectionId,
    );
    if (!conn) {
      throw new Error("接続が見つかりません");
    }
    if (conn.authType === "OAUTH") {
      throw new Error("OAuth接続の認証情報はOAuth再設定から更新してください");
    }

    const existing = await safeDecryptCredentialsRecord(
      conn.secret.credentials,
    );
    const merged = mergeCredentials(
      existing,
      inputCredentials,
      CREDENTIALS_MASK_VALUE,
    );

    // 実質変更がない（全フィールドが MASK or 空文字、もしくは既存に無いキーのみ）場合は
    // 何もせずトランザクションを閉じる。renderer 側でも canSubmit でガード済みだが、
    // IPC 直叩きや将来の呼び出し経路から no-op で呼ばれたときに secret 差し替えと
    // orphan 掃除が走らないようサービス層でも防衛する。
    // mergeCredentials は既存に無いキーを追加しないため、existing と merged のキー集合は
    // 常に一致する。全キーの値一致だけ確認すれば充分。
    const isUnchanged = Object.keys(existing).every(
      (key) => existing[key] === merged[key],
    );
    if (isUnchanged) return;

    const encrypted = await encryptToken(JSON.stringify(merged));
    const newSecret = await mcpRepository.createSecret(tx, encrypted);
    const oldSecretId = conn.secretId;
    await mcpRepository.updateConnectionSecretId(
      tx,
      connectionId,
      newSecret.id,
    );
    await mcpRepository.deleteSecretIfOrphaned(tx, oldSecretId);
  });

  logger.info(
    `MCP connection credentials updated: connectionId=${String(connectionId)}`,
  );
};

// cascade で接続削除 → 参照カウント0 の secret を後始末する一連を1トランザクションで実行
export const deleteServer = async (id: number) => {
  const db = await getDb();
  return db.$transaction(async (tx) => {
    const secretIds = await mcpRepository.findSecretIdsByServerId(tx, id);
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
