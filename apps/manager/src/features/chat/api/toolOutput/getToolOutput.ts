/**
 * ツール出力取得クエリ
 *
 * BigQueryからtoolCallIdを使用してツール出力を取得する。
 */

import { z } from "zod";
import { getBigQueryClient, getFullTableName } from "@/lib/bigquery/client";

/**
 * 入力スキーマ
 */
export const getToolOutputInputSchema = z.object({
  /** ツール呼び出しID */
  toolCallId: z.string().min(1),
});

/**
 * 出力スキーマ
 */
export const getToolOutputOutputSchema = z.object({
  /** ツール出力（JSONオブジェクト） */
  output: z.unknown().nullable(),
  /** 取得日時 */
  fetchedAt: z.string(),
});

export type GetToolOutputInput = z.infer<typeof getToolOutputInputSchema>;
export type GetToolOutputOutput = z.infer<typeof getToolOutputOutputSchema>;

/**
 * BigQueryからツール出力を取得
 *
 * @param input - 入力パラメータ
 * @param organizationId - 組織ID（セキュリティフィルタ用）
 * @returns ツール出力
 */
export const getToolOutput = async (
  input: GetToolOutputInput,
  organizationId: string,
): Promise<GetToolOutputOutput> => {
  const { toolCallId } = input;

  const bigQuery = getBigQueryClient();
  const tableName = getFullTableName("mcp_requests");

  // BigQueryからtoolCallIdでレスポンスボディを検索
  // attributesにorganizationIdが含まれているので、セキュリティフィルタとして使用
  const query = `
    SELECT JSON_QUERY(data, '$.responseBody') as responseBody
    FROM \`${tableName}\`
    WHERE JSON_VALUE(data, '$.toolCallId') = @toolCallId
      AND JSON_VALUE(attributes, '$.organizationId') = @organizationId
    ORDER BY publish_time DESC
    LIMIT 1
  `;

  const [rows] = await bigQuery.query({
    query,
    params: {
      toolCallId,
      organizationId,
    },
  });

  // 結果がない場合
  if (!rows || rows.length === 0) {
    return {
      output: null,
      fetchedAt: new Date().toISOString(),
    };
  }

  // responseBodyをパース
  const row = rows[0] as { responseBody: string | null };

  // responseBodyが存在しない場合はnullを返す
  if (!row.responseBody) {
    return {
      output: null,
      fetchedAt: new Date().toISOString(),
    };
  }

  // JSONパースを試みる
  try {
    return {
      output: JSON.parse(row.responseBody),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    // パースに失敗した場合は文字列として返す
    return {
      output: row.responseBody,
      fetchedAt: new Date().toISOString(),
    };
  }
};
