import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { mcpServersAtom } from "../store/atoms";
import { Activity, Server, AlertCircle, Wifi } from "lucide-react";
import { trpc } from "../utils/trpc";

// ポーリング間隔の設定
// サーキットブレーカーパターンを実装し、連続エラー時はポーリングを停止
const POLLING_CONFIG = {
  MIN_INTERVAL_MS: 10000, // 最小間隔: 10秒
  MAX_INTERVAL_MS: 60000, // 最大間隔: 60秒
  CIRCUIT_BREAKER_THRESHOLD: 5, // サーキットブレーカー閾値: 5回連続エラーで停止
  BACKOFF_MULTIPLIER: 2, // バックオフ倍率
} as const;

/**
 * 適応的ポーリング間隔を計算
 * エラー回数に応じて指数バックオフで間隔を増加
 * サーキットブレーカー: 閾値を超えるとポーリングを停止（false を返す）
 */
const calculatePollingInterval = (errorCount: number): number | false => {
  // サーキットブレーカー: 閾値を超えたらポーリングを停止
  if (errorCount >= POLLING_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
    return false; // React Queryでrefetchを停止
  }

  if (errorCount === 0) {
    return POLLING_CONFIG.MIN_INTERVAL_MS;
  }

  // 指数バックオフ: 10秒 → 20秒 → 40秒 → 60秒（最大）
  const backoffInterval =
    POLLING_CONFIG.MIN_INTERVAL_MS *
    Math.pow(POLLING_CONFIG.BACKOFF_MULTIPLIER, errorCount - 1);
  return Math.min(backoffInterval, POLLING_CONFIG.MAX_INTERVAL_MS);
};

export const Dashboard = (): JSX.Element => {
  const servers = useAtomValue(mcpServersAtom);

  // エラー回数を追跡して、適応的ポーリング間隔を実装
  const [errorCount, setErrorCount] = useState(0);

  // エラー回数に基づいてポーリング間隔を計算
  const pollingInterval = calculatePollingInterval(errorCount);

  // Manager 接続テスト
  const healthQuery = trpc.health.ping.useQuery(undefined, {
    refetchInterval: pollingInterval,
    refetchOnWindowFocus: true,
  });

  // エラー状態の変化を監視してエラーカウントを更新
  useEffect(() => {
    let isMounted = true;

    if (healthQuery.isError && isMounted) {
      // サーキットブレーカー閾値までカウントを増加
      setErrorCount((prev) =>
        Math.min(prev + 1, POLLING_CONFIG.CIRCUIT_BREAKER_THRESHOLD),
      );
    } else if (healthQuery.isSuccess && isMounted) {
      // 成功時はエラーカウントをリセット（サーキットブレーカーを復帰）
      setErrorCount(0);
    }

    // クリーンアップ関数でマウント状態をクリア
    return () => {
      isMounted = false;
    };
  }, [healthQuery.isError, healthQuery.isSuccess]);

  const stats = {
    total: servers.length,
    running: servers.filter((s) => s.status === "running").length,
    stopped: servers.filter((s) => s.status === "stopped").length,
    error: servers.filter((s) => s.status === "error").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="mt-1 text-sm text-gray-600">
          MCPサーバーの状態を一覧で確認できます
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総サーバー数</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats.total}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Server className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">起動中</p>
              <p className="mt-2 text-3xl font-semibold text-green-600">
                {stats.running}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Activity className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">停止中</p>
              <p className="mt-2 text-3xl font-semibold text-gray-600">
                {stats.stopped}
              </p>
            </div>
            <div className="rounded-full bg-gray-100 p-3">
              <Server className="text-gray-600" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">エラー</p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {stats.error}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Manager 接続状態 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Manager 接続状態
          </h3>
          <div
            className={`flex items-center space-x-2 rounded-full px-3 py-1 text-sm font-medium ${
              healthQuery.isLoading
                ? "bg-yellow-100 text-yellow-800"
                : healthQuery.isError
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
            }`}
          >
            <Wifi size={16} />
            <span>
              {healthQuery.isLoading
                ? "接続確認中..."
                : healthQuery.isError
                  ? "接続失敗"
                  : "接続中"}
            </span>
          </div>
        </div>
        {healthQuery.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">
              エラー: {healthQuery.error.message}
            </p>
            <p className="mt-1 text-xs text-red-600">
              Manager が起動しているか確認してください。
            </p>
            {pollingInterval === false && (
              <div className="mt-2">
                <p className="text-xs text-red-700">
                  接続エラーが続いたため、自動再接続を停止しました。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setErrorCount(0);
                    healthQuery.refetch();
                  }}
                  className="mt-2 rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                >
                  手動で再接続
                </button>
              </div>
            )}
          </div>
        )}
        {healthQuery.isSuccess && (
          <div className="mt-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              ステータス: {healthQuery.data.status}
            </p>
            <p className="text-sm text-green-800">
              メッセージ: {healthQuery.data.message}
            </p>
            <p className="text-xs text-green-600">
              最終確認: {new Date(healthQuery.data.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          クイックスタート
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          左側のメニューから「MCPサーバー」を選択して、サーバーを管理できます。
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-start space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              1
            </div>
            <p className="text-sm text-gray-700">
              MCPサーバーページで利用可能なサーバーを確認
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              2
            </div>
            <p className="text-sm text-gray-700">起動ボタンでサーバーを起動</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              3
            </div>
            <p className="text-sm text-gray-700">
              設定ページでアプリケーションの動作をカスタマイズ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
