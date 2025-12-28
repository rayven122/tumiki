/**
 * Pub/Sub クライアント
 *
 * BigQueryへのログストリーミング用にPub/Subトピックを提供
 */

import { PubSub, type Topic } from "@google-cloud/pubsub";

// Pub/Subクライアントのシングルトン
let pubsubClient: PubSub | null = null;
let mcpLogsTopicInstance: Topic | null = null;

/**
 * Pub/Subクライアントを取得
 * 必要な環境変数が設定されていない場合はnullを返す
 */
const getPubSubClient = (): PubSub | null => {
  if (pubsubClient) {
    return pubsubClient;
  }

  // BigQueryログが無効な場合はnullを返す
  if (!isBigQueryLoggingEnabled()) {
    return null;
  }

  // PubSubはADCからプロジェクトIDを自動取得
  pubsubClient = new PubSub();
  return pubsubClient;
};

/**
 * MCPログ用のPub/Subトピックを取得
 * PUBSUB_MCP_LOGS_TOPICが設定されていない場合はnullを返す
 */
export const getMcpLogsTopic = (): Topic | null => {
  if (mcpLogsTopicInstance) {
    return mcpLogsTopicInstance;
  }

  const client = getPubSubClient();
  if (!client) {
    return null;
  }

  // PUBSUB_MCP_LOGS_TOPIC は必須（isBigQueryLoggingEnabled で既にチェック済み）
  const topicName = process.env.PUBSUB_MCP_LOGS_TOPIC;
  mcpLogsTopicInstance = client.topic(topicName!);
  return mcpLogsTopicInstance;
};

/**
 * BigQueryログが有効かどうかを判定
 * PUBSUB_MCP_LOGS_TOPICが設定されている場合に有効
 */
export const isBigQueryLoggingEnabled = (): boolean => {
  return !!process.env.PUBSUB_MCP_LOGS_TOPIC;
};
