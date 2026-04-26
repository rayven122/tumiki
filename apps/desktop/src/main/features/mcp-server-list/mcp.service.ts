import { ServerStatus } from "@prisma/desktop-client";
import { getDb } from "../../shared/db";
import type { DbClient } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as catalogRepository from "../catalog/catalog.repository";
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
} from "./mcp.types";
import { fetchToolsForCatalogs as fetchToolsForCatalogsImpl } from "./mcp-tool-fetcher.service";

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

  // 暗号化（CPU/IO重）をtx外で並列実行
  const encryptedCredentialsList = await Promise.all(
    input.connections.map((conn) =>
      encryptToken(JSON.stringify(conn.credentials)),
    ),
  );

  // カタログ取得・バリデーション・接続slug計算もtx外で完了させる
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
      return { catalog, index };
    }),
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

      // 接続単位のツール一覧が渡されている場合のみ McpTool を保存
      // 旧呼び出し（tools未指定）も後方互換で動作させるため optional 扱い
      const inputTools = input.connections[index]?.tools;
      if (inputTools && inputTools.length > 0) {
        await mcpRepository.createTools(
          tx,
          inputTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            isAllowed: t.isAllowed,
            // 空文字は「上書きなし」として扱う
            customDescription:
              t.customDescription && t.customDescription.trim() !== ""
                ? t.customDescription
                : null,
            connectionId: connection.id,
          })),
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

/**
 * proxy 起動時に使うツール公開ポリシーマップを構築する
 * key 形式: `${configName}::${toolName}` （configName は `${serverSlug}-${connectionSlug}`）
 * value は McpTool レコードから派生した (isAllowed, customDescription)
 *
 * McpTool レコードが存在しないツールは map に含まれず、proxy 側ではデフォルト動作（公開）になる。
 * これにより 1:1 (createFromCatalog) で作成された既存サーバーは挙動が変わらない。
 */
export const buildToolPolicyMap = async (
  serverSlug: string,
): Promise<Map<string, { isAllowed: boolean; customDescription?: string }>> => {
  const db = await getDb();
  const tools = await mcpRepository.findToolsByServerSlug(db, serverSlug);
  const policyMap = new Map<
    string,
    { isAllowed: boolean; customDescription?: string }
  >();
  for (const tool of tools) {
    const configName = `${tool.connection.server.slug}-${tool.connection.slug}`;
    const key = `${configName}::${tool.name}`;
    policyMap.set(key, {
      isAllowed: tool.isAllowed,
      customDescription:
        tool.customDescription && tool.customDescription.trim() !== ""
          ? tool.customDescription
          : undefined,
    });
  }
  return policyMap;
};

/**
 * 仮想MCP作成前に各カタログのツール一覧を取得する
 * UIで「次へ」ボタンを押した時に呼ばれる前段処理
 *
 * - inputs: カタログIDと認証情報のペア
 * - 各カタログに一時接続して tools/list を取得 → 切断
 * - 1件失敗しても他は続行する（Promise.allSettled）
 */
export const fetchToolsForCatalogs = async (
  input: FetchToolsInput,
): Promise<FetchToolsResult> => {
  const results = await fetchToolsForCatalogsImpl(input.items);
  return {
    items: results.map((r) => ({
      catalogId: r.catalogId,
      tools: r.tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: JSON.stringify(t.inputSchema ?? {}),
      })),
      error: r.error,
    })),
  };
};
