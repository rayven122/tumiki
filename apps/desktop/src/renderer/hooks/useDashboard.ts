import { useState, useEffect, useRef } from "react";
import type { DashboardPeriod, DashboardResult } from "../../main/types";
import { toast } from "../_components/Toast";

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL_MS = 5000;

/**
 * ダッシュボード集計を取得し、定期ポーリングで更新するフック
 */
export const useDashboard = (period: DashboardPeriod) => {
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    // 期間切替時は読み込み中状態に戻し、エラートーストも再度表示できるようにする
    setLoading(true);
    isFirstLoad.current = true;

    const fetch = async (): Promise<void> => {
      try {
        const data = await window.electronAPI.dashboard.get({ period });
        if (!cancelled) {
          setResult(data);
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        // ポーリング失敗時はトーストを初回のみ表示し、以降は前回データを保持
        if (isFirstLoad.current) {
          toast.error(`ダッシュボードの取得に失敗しました: ${message}`);
          setResult(null);
        } else {
          // 静かに古いデータが表示され続けるのを避けるため警告ログを残す
          console.warn("[useDashboard] ポーリング更新に失敗しました:", message);
        }
      } finally {
        if (!cancelled && isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    };

    void fetch();
    const timer = setInterval(() => void fetch(), POLLING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [period]);

  return { result, loading };
};
