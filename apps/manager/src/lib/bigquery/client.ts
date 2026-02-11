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
 * - GOOGLE_CLOUD_PROJECT: GCPプロジェクトID
 * - BIGQUERY_DATASET: データセット名（デフォルト: tumiki_logs）
 *
 * @returns BigQueryクライアント
 */
export const getBigQueryClient = (): BigQuery => {
  bigQueryClient ??= new BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
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
