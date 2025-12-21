import { useEffect, useState } from "react";

// ポーリング間隔の設定（フック内で固定）
const ACTIVE_INTERVAL = 30000; // アクティブ時: 30秒
const INACTIVE_INTERVAL = 120000; // 非アクティブ時: 2分
const BACKGROUND_INTERVAL: false = false; // バックグラウンド時: ポーリング停止

/**
 * アダプティブなポーリング間隔を提供するカスタムフック
 *
 * @returns 現在のポーリング間隔（ミリ秒）、またはfalse（ポーリング停止）
 *
 * @description
 * ページの表示状態とユーザーのアクティビティに応じて、ポーリング間隔を動的に調整します：
 * - アクティブ（ページ表示中 + 最近の操作あり）: 30秒
 * - 非アクティブ（ページ表示中 + 操作なし）: 2分
 * - バックグラウンド（ページ非表示）: ポーリング停止
 */
export const useAdaptivePolling = (): number | false => {
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Page Visibility API でページの表示状態を監視
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      // ページが非表示の場合はアクティビティ監視不要
      return;
    }

    let activityTimeout: NodeJS.Timeout;

    // ユーザーアクティビティを検出
    const handleActivity = () => {
      setIsActive(true);

      // 30秒間操作がなければ非アクティブとみなす
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        setIsActive(false);
      }, 30000);
    };

    // 各種ユーザーイベントを監視
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // 初期アクティビティ設定
    handleActivity();

    return () => {
      clearTimeout(activityTimeout);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isVisible]);

  // 状態に応じたポーリング間隔を返す
  if (!isVisible) {
    return BACKGROUND_INTERVAL;
  }

  return isActive ? ACTIVE_INTERVAL : INACTIVE_INTERVAL;
};
