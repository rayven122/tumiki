/**
 * BigQuery クライアント
 *
 * GCP BigQueryへのアクセスを提供するクライアント。
 * 環境変数でプロジェクトIDとデータセットを設定。
 */

import { BigQuery } from "@google-cloud/bigquery";

/**
 * BigQueryクライアントのシングルトンインスタンス
 */
let bigQueryClient: BigQuery | null = null;

/**
 * BigQueryクライアントを取得
 *
 * 環境変数:
 * - GOOGLE_CLOUD_PROJECT: GCPプロジェクトID（必須）
 * - BIGQUERY_DATASET: データセット名（デフォルト: tumiki_logs）
 *
 * @returns BigQueryクライアント
 * @throws Error GOOGLE_CLOUD_PROJECT環境変数が未設定の場合
 */
export const getBigQueryClient = (): BigQuery => {
  if (!bigQueryClient) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT environment variable is required for BigQuery",
      );
    }
    bigQueryClient = new BigQuery({ projectId });
  }
  return bigQueryClient;
};

/**
 * BigQueryデータセット名を取得
 *
 * @returns データセット名
 */
export const getBigQueryDataset = (): string => {
  return process.env.BIGQUERY_DATASET ?? "tumiki_logs";
};

/**
 * BigQueryテーブルの完全名を取得
 *
 * @param tableName - テーブル名
 * @returns 完全なテーブル名（dataset.table形式）
 */
export const getFullTableName = (tableName: string): string => {
  return `${getBigQueryDataset()}.${tableName}`;
};
