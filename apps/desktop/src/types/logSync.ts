/**
 * ログ同期キューのステータス型
 * SQLiteではPrismaのenumが使えないため、アプリ側で型を定義
 */
export type LogSyncStatus = "pending" | "syncing" | "synced" | "failed";
