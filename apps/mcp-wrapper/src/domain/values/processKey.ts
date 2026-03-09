import { createHash } from "node:crypto";

/**
 * プロセスキー値オブジェクト
 * serverName + 環境変数ハッシュで一意に識別
 */
export type ProcessKey = {
  readonly value: string;
  readonly serverName: string;
  readonly envHash: string;
};

/**
 * プロセスキーを生成
 *
 * 同一サーバーでも異なる環境変数（APIキー等）の場合は
 * 別プロセスとして管理するため、ハッシュで区別する
 */
export const createProcessKey = (
  serverName: string,
  env: Record<string, string>,
): ProcessKey => {
  // 環境変数をソートして一意なハッシュを生成
  const sortedEnv = Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(";");

  const envHash = createHash("sha256")
    .update(sortedEnv)
    .digest("hex")
    .slice(0, 8);

  return {
    value: `${serverName}:${envHash}`,
    serverName,
    envHash,
  };
};
