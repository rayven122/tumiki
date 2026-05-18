/**
 * OAuth トークンの定期リフレッシュスケジューラ。
 *
 * MCP プロキシ常駐ユースケース（Claude Desktop 等）では数日プロセスが生き続けるため、
 * 起動時のみの lazy refresh では access_token が必ず寿命切れになる。
 * setInterval で定期的に全 OAuth secret を refresh し、結果を in-memory cache に反映して
 * 既存 transport の getHeaders が常に最新の token を返せるようにする。
 */

import { z } from "zod";
import { getDb } from "../../shared/db";
import { decryptCredentials } from "../../utils/credentials";
import * as logger from "../../shared/utils/logger";
import { refreshOAuthTokenIfNeeded } from "./oauth.refresh";
import { setCachedCredentials } from "./credentials-cache";

/** デフォルト実行間隔: 5 分。REFRESH_THRESHOLD_SECONDS (= 5 分) と揃えて取りこぼしを防ぐ */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

// mcp-proxy.service.ts の connectionEnvSchema と揃え、credentials の全値が string であることを保証する。
// 破損・改ざんで非文字列が混ざった場合、refreshOAuthTokenIfNeeded に渡す前にスキップする。
const credentialsSchema = z.record(z.string(), z.string());

let intervalId: NodeJS.Timeout | undefined;

/**
 * OAuth 接続を伴う全 secret を取得し、必要なら refresh して cache を更新する。
 *
 * - 複数接続が同じ secretId を共有するケースは dedupe（refresh_token rotation 衝突回避）
 * - refresh が実行されなかった場合（まだ有効期限が遠い）でも、cache が空の場合は現在値を入れる
 * - secret 単位のエラーは握り潰し、他の secret 処理を継続する
 */
export const refreshAllOAuthSecrets = async (): Promise<void> => {
  const db = await getDb();
  const connections = await db.mcpConnection.findMany({
    where: { authType: "OAUTH", url: { not: null } },
    select: {
      secretId: true,
      url: true,
      secret: { select: { credentials: true } },
    },
  });

  const seen = new Map<number, { url: string; encryptedCredentials: string }>();
  for (const conn of connections) {
    if (!conn.url) continue;
    if (seen.has(conn.secretId)) continue;
    seen.set(conn.secretId, {
      url: conn.url,
      encryptedCredentials: conn.secret.credentials,
    });
  }

  for (const [secretId, { url, encryptedCredentials }] of seen) {
    try {
      const decrypted = await decryptCredentials(encryptedCredentials);
      const parsed = credentialsSchema.safeParse(JSON.parse(decrypted));
      if (!parsed.success) {
        logger.warn(
          "OAuth scheduler: credentials のスキーマ検証に失敗しました（skip）",
          { secretId, error: parsed.error.message },
        );
        continue;
      }
      const credentials = parsed.data;

      const refreshed = await refreshOAuthTokenIfNeeded(
        secretId,
        url,
        credentials,
      );
      setCachedCredentials(secretId, refreshed ?? credentials);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("OAuth scheduler: secret の処理に失敗しました", {
        secretId,
        error: message,
      });
    }
  }
};

/** scheduler 起動。既に走っている場合は再起動する。 */
export const startOAuthRefreshScheduler = (
  intervalMs: number = DEFAULT_INTERVAL_MS,
): void => {
  stopOAuthRefreshScheduler();

  // 起動直後の 1 発で cache を初期化（最初の getHeaders 呼び出しでフォールバックを発火させない）
  void runWithLogging("初回実行");

  intervalId = setInterval(() => {
    void runWithLogging("定期実行");
  }, intervalMs);
  // 親プロセス（Electron）が終了する際に setInterval だけで生き残るのを防ぐ
  intervalId.unref?.();

  logger.info("OAuth リフレッシュスケジューラを開始しました", { intervalMs });
};

export const stopOAuthRefreshScheduler = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
};

const runWithLogging = async (phase: string): Promise<void> => {
  try {
    await refreshAllOAuthSecrets();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`OAuth scheduler: ${phase}で予期しないエラー`, {
      error: message,
    });
  }
};
