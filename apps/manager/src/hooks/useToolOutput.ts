/**
 * ツール出力取得フック
 *
 * BigQueryからツール出力をオンデマンドでフェッチするカスタムフック。
 * outputRefが指定された場合にのみフェッチを実行。
 */

import { api } from "@/trpc/react";

type UseToolOutputParams = {
  /** ツール呼び出しID（outputRef） */
  toolCallId: string | undefined;
  /** フェッチを有効にするかどうか */
  enabled?: boolean;
};

type UseToolOutputResult = {
  /** ツール出力データ */
  output: unknown;
  /** ローディング中かどうか */
  isLoading: boolean;
  /** エラー */
  error: { message: string } | null;
  /** フェッチ済みかどうか */
  isFetched: boolean;
};

/**
 * ツール出力を取得するフック
 *
 * @param params - パラメータ
 * @returns ツール出力と状態
 */
export const useToolOutput = ({
  toolCallId,
  enabled = true,
}: UseToolOutputParams): UseToolOutputResult => {
  const { data, isLoading, error, isFetched } = api.toolOutput.get.useQuery(
    { toolCallId: toolCallId ?? "" },
    {
      enabled: enabled && !!toolCallId,
      // キャッシュを長めに設定（ツール出力は変更されない）
      staleTime: 1000 * 60 * 60, // 1時間
      gcTime: 1000 * 60 * 60 * 24, // 24時間
    },
  );

  return {
    output: data?.output ?? null,
    isLoading,
    error: error ?? null,
    isFetched,
  };
};
