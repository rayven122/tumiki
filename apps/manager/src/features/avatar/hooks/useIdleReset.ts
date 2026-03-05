"use client";

/**
 * アイドル自動リセットフック
 * 一定時間操作がなければ自動的に新規セッションへリダイレクト
 * 受付キオスク端末向け：前の来訪者の会話が残らないようにする
 */

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type UseIdleResetOptions = {
  /** アイドルタイムアウト（ミリ秒）。デフォルト: 120000（2分） */
  timeout?: number;
  /** リダイレクト先パス */
  redirectTo: string;
  /** メッセージがない場合はリセットしない */
  hasMessages: boolean;
  /** 無効化フラグ */
  disabled?: boolean;
  /** リセット前に呼ばれるコールバック */
  onBeforeReset?: () => void;
};

export const useIdleReset = ({
  timeout = 120_000,
  redirectTo,
  hasMessages,
  disabled = false,
  onBeforeReset,
}: UseIdleResetOptions) => {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef(0);
  const onBeforeResetRef = useRef(onBeforeReset);

  useEffect(() => {
    onBeforeResetRef.current = onBeforeReset;
  }, [onBeforeReset]);

  // タイマーをリセット
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    countdownRef.current = 0;

    if (disabled || !hasMessages) return;

    timerRef.current = setTimeout(() => {
      onBeforeResetRef.current?.();
      router.push(redirectTo);
    }, timeout);
  }, [timeout, redirectTo, hasMessages, disabled, router]);

  // ユーザー操作を監視してリセット
  useEffect(() => {
    if (disabled) return;

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
    ] as const;

    const handleActivity = () => {
      resetTimer();
    };

    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    resetTimer();

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetTimer, disabled]);

  return { resetTimer };
};
