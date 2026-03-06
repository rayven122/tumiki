import { OFFICIAL_ORGANIZATION_ID } from "@tumiki/db";

/**
 * アプリケーション設定定数
 */
export const config = {
  /** HTTPサーバーポート */
  port: parseInt(process.env.PORT ?? "8080", 10),
  /** 最大プロセス数 */
  maxProcesses: parseInt(process.env.MAX_PROCESSES ?? "20", 10),
  /** アイドルタイムアウト（ミリ秒） */
  idleTimeoutMs: parseInt(process.env.IDLE_TIMEOUT_MS ?? "300000", 10),
  /** リクエストタイムアウト（ミリ秒） */
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS ?? "60000", 10),
  /** 公式テンプレートの組織ID */
  officialOrganizationId:
    process.env.OFFICIAL_ORGANIZATION_ID ?? OFFICIAL_ORGANIZATION_ID,
} as const;
