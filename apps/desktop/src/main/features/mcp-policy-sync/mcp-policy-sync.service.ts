import { ServerType, type PrismaClient } from "@prisma/desktop-client";
import { getDb } from "../../shared/db";
import * as mcpRepository from "../mcp-server-list/mcp.repository";
import { requestManagerApi } from "../../shared/manager-api-client";
import { encryptToken } from "../../utils/encryption";
import { toSlug, generateRandomSuffix } from "../../../shared/mcp.slug";
import * as logger from "../../shared/utils/logger";
import {
  mcpConfigsResponseSchema,
  type CloudMcpServer,
  type CloudMcpTemplateInstance,
  type McpPolicySyncResult,
} from "./mcp-policy-sync.types";

const FETCH_TIMEOUT_MS = 10_000;

// クラウドのTransportTypeをDesktopのTransportTypeにマッピング
// cloud: STREAMABLE_HTTPS / desktop: STREAMABLE_HTTP（末尾のSの差異）
const toDesktopTransportType = (
  cloudType: CloudMcpTemplateInstance["transportType"],
): "STDIO" | "SSE" | "STREAMABLE_HTTP" => {
  if (cloudType === "STREAMABLE_HTTPS") return "STREAMABLE_HTTP";
  return cloudType;
};

const buildConnectionParams = (
  serverName: string,
  slug: string,
  instance: CloudMcpTemplateInstance,
  secretId: number,
  serverId: number,
): Parameters<typeof mcpRepository.createConnection>[1] => {
  const transportType = toDesktopTransportType(instance.transportType);
  return {
    name: serverName,
    slug,
    transportType,
    command: transportType === "STDIO" ? instance.command : null,
    args: JSON.stringify(instance.args),
    url: transportType !== "STDIO" ? instance.url : null,
    secretId,
    authType: instance.authType,
    serverId,
    catalogId: null,
  };
};

/**
 * 配布されたMCPサーバーが既に存在する場合、設定を更新する（認証情報は変更しない）
 *
 * slug はローカルルーティングで使われるため変更しない。
 * クラウド側で slug が変更された場合は次回 sync で新規サーバーとして作成される。
 * この設計は slug がクラウド側で変更されないことを前提としており、
 * 変更が必要な場合は cloudId カラムの追加による同一性管理への移行を検討すること。
 *
 * db は `$transaction` を呼ぶため `PrismaClient` 限定（TransactionClient では呼べない）。
 * リポジトリ関数は引き続き `DbClient` で受けるため tx 内外で再利用できる。
 */
const updateCloudMcpServer = async (
  db: PrismaClient,
  existingServerId: number,
  server: CloudMcpServer,
): Promise<void> => {
  const primaryInstance =
    server.templateInstances.find((inst) => inst.isEnabled) ??
    server.templateInstances[0];

  if (!primaryInstance) return;

  await db.$transaction(async (tx) => {
    // サーバーのメタ情報を更新
    await mcpRepository.updateServer(tx, existingServerId, {
      name: server.name,
      description: server.description,
    });

    // 既存の接続を取得して transport 設定を上書き（認証情報 = secret は変更しない）。
    // クラウド配布サーバーは createCloudMcpServer で接続を1件しか作らない不変条件のため、
    // serverId 配下の全接続を primaryInstance で上書きしても安全。
    // ユーザーが手動で接続を追加する経路は現状想定外（追加された場合は要再設計）。
    const connections = await tx.mcpConnection.findMany({
      where: { serverId: existingServerId },
      select: { id: true, secretId: true },
    });

    const transportType = toDesktopTransportType(primaryInstance.transportType);
    for (const conn of connections) {
      await tx.mcpConnection.update({
        where: { id: conn.id },
        data: {
          name: server.name,
          transportType,
          command: transportType === "STDIO" ? primaryInstance.command : null,
          args: JSON.stringify(primaryInstance.args),
          url: transportType !== "STDIO" ? primaryInstance.url : null,
          authType: primaryInstance.authType,
        },
      });

      // ツールをクラウド定義で同期（全削除→再作成）
      await tx.mcpTool.deleteMany({ where: { connectionId: conn.id } });
      if (primaryInstance.tools.length > 0) {
        await tx.mcpTool.createMany({
          data: primaryInstance.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: JSON.stringify(t.inputSchema ?? {}),
            connectionId: conn.id,
            isAllowed: true,
          })),
        });
      }
    }
  });
};

/**
 * 配布されたMCPサーバー1台分をローカルDBに新規登録する
 */
const createCloudMcpServer = async (
  db: PrismaClient,
  server: CloudMcpServer,
): Promise<boolean> => {
  const primaryInstance =
    server.templateInstances.find((inst) => inst.isEnabled) ??
    server.templateInstances[0];

  if (!primaryInstance) {
    logger.warn(
      `MCP policy sync: テンプレートインスタンスがありません (${server.slug})`,
    );
    return false;
  }

  // 初期認証情報は空（ユーザーが後から入力）
  const encryptedCredentials = await encryptToken(JSON.stringify({}));

  await db.$transaction(async (tx) => {
    // slug 生成をトランザクション内で実施し、チェックと作成を原子的に行う。
    // 異常系で無限ループにならないよう最大試行回数を制限する
    const MAX_SLUG_ATTEMPTS = 100;
    const baseSlug = toSlug(server.slug) || generateRandomSuffix();
    let slug = baseSlug;
    let counter = 1;
    while (await mcpRepository.findServerBySlug(tx, slug)) {
      if (counter >= MAX_SLUG_ATTEMPTS) {
        throw new Error(`slug 生成に失敗しました (base: ${baseSlug})`);
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // serverType は現状 OFFICIAL（カタログ経由と同等）として保存する。
    // TODO: クラウド配布サーバーをローカル登録と区別する場合は
    // ServerType.CLOUD_MANAGED 相当の enum 値を追加することを検討する
    //
    // 注意: cloud は server.iconPath を返すが desktop の McpServer モデルに該当フィールドがないため
    // 現状は保存しない（desktop UI ではカタログ由来のアイコンを別経路で表示する想定）
    const createdServer = await mcpRepository.createServer(tx, {
      name: server.name,
      slug,
      description: server.description,
      serverType: ServerType.OFFICIAL,
    });

    const secret = await mcpRepository.createSecret(tx, encryptedCredentials);
    const connection = await mcpRepository.createConnection(
      tx,
      buildConnectionParams(
        server.name,
        slug,
        primaryInstance,
        secret.id,
        createdServer.id,
      ),
    );

    if (primaryInstance.tools.length > 0) {
      await mcpRepository.createTools(
        tx,
        primaryInstance.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: JSON.stringify(t.inputSchema ?? {}),
          connectionId: connection.id,
          isAllowed: true,
        })),
      );
    }
  });
  return true;
};

// IPC ハンドラの多重呼び出しによる二重作成（findServerBySlug→createServer 間の race）
// を防ぐためのモジュールスコープのガード。SQLite の単一プロセス前提で十分。
let isSyncing = false;

/**
 * manager から MCP 設定を取得してローカル DB に適用する（upsert）
 * - 新規: McpServer + McpConnection + McpTool を作成（認証情報は空でユーザーが後から入力）
 * - 既存: name/description/transport 設定・ツール一覧を更新（認証情報は変更しない）
 *
 * 並行実行ガード: 既に実行中の場合はエラーをスローし、二重実行を防ぐ。
 * 同期は冪等だが、findServerBySlug→createServer 間で並行実行すると重複作成のリスクがある。
 */
export const syncMcpPolicies = async (): Promise<McpPolicySyncResult> => {
  if (isSyncing) {
    throw new Error("MCPポリシー同期が既に実行中です");
  }
  isSyncing = true;
  try {
    return await runSync();
  } finally {
    isSyncing = false;
  }
};

const runSync = async (): Promise<McpPolicySyncResult> => {
  const response = await requestManagerApi("/api/desktop/v1/mcp-configs", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response) {
    throw new Error("管理サーバーへの接続に失敗しました");
  }
  if (response.status === 401) {
    throw new Error("管理サーバーへの再ログインが必要です");
  }
  if (!response.ok) {
    throw new Error(`MCP設定の取得に失敗しました（${response.status}）`);
  }

  const data: unknown = await response.json();
  const parsed = mcpConfigsResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("管理サーバーからの応答フォーマットが不正です");
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const db = await getDb();

  // cloud slug をキーにして upsert する。slug 衝突時はサフィックスを付与して新規作成するため、
  // 衝突後の slug（例: my-server-1）は次回 sync で "新規" と判定され重複が生じる。
  // 実運用上クラウド側の slug は一意かつ不変として運用し、問題が顕在化した場合は
  // cloudId カラムを追加して同一性管理を行うこと。
  // TODO: cloud server id を保存するカラムを追加して slug 非依存の同一性管理に移行する
  //
  // 削除同期は現状サポートしない（クラウド配布リストから外れたサーバーはローカルに残置）。
  // クラウド由来とローカル登録の区別ができないため安全側に倒した設計。
  // 削除サポートは cloudId カラム追加・ServerType.CLOUD_MANAGED 導入とセットで検討する。
  //
  // 個別サーバーの失敗で全同期が中断しないよう Best-effort 方式で処理する。
  // 失敗したサーバーは警告ログを残してスキップし、後続を継続する。
  for (const server of parsed.data.mcpServers) {
    try {
      const existing = await mcpRepository.findServerBySlug(db, server.slug);

      if (existing) {
        await updateCloudMcpServer(db, existing.id, server);
        updated++;
        logger.info(`MCP policy sync: 更新 ${server.name} (${server.slug})`);
      } else {
        const wasCreated = await createCloudMcpServer(db, server);
        if (wasCreated) {
          created++;
          logger.info(`MCP policy sync: 作成 ${server.name} (${server.slug})`);
        } else {
          // templateInstances 空など、警告ログを出してスキップしたケース
          failed++;
        }
      }
    } catch (error) {
      failed++;
      logger.warn(`MCP policy sync: スキップ ${server.name} (${server.slug})`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info(
    `MCP policy sync 完了: 作成=${String(created)}, 更新=${String(updated)}, 失敗=${String(failed)}`,
  );

  return { created, updated, failed };
};
