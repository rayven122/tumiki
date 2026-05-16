import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AiCodingTool,
  GetToolSettingsResult,
  ReceiverStatus,
} from "../../main/types";

type ToolSettingsResult = {
  settings: GetToolSettingsResult | null;
  isLoading: boolean;
  refresh: () => void;
};

type ReceiverStatusResult = {
  receiverStatus: ReceiverStatus | null;
  isLoading: boolean;
  refresh: () => void;
};

// ツールのテレメトリ設定を取得するフック（refresh 関数付き）
export const useAiCodingToolSettings = (
  tool: AiCodingTool,
): ToolSettingsResult => {
  const [settings, setSettings] = useState<GetToolSettingsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 進行中リクエストのキャンセルトークン。ref で保持することで refresh でも前回分を無効化できる
  const cancelRef = useRef<{ value: boolean }>({ value: false });

  const load = useCallback((): void => {
    // 前回のリクエストをキャンセル
    cancelRef.current.value = true;
    const cancelled = { value: false };
    cancelRef.current = cancelled;

    setIsLoading(true);
    window.electronAPI.aiCodingTelemetry
      .getToolSettings(tool)
      .then((result) => {
        if (!cancelled.value) setSettings(result);
      })
      .catch(() => {
        if (!cancelled.value) setSettings(null);
      })
      .finally(() => {
        if (!cancelled.value) setIsLoading(false);
      });
  }, [tool]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.value = true;
    };
  }, [load]);

  return { settings, isLoading, refresh: load };
};

// OTLP レシーバーのポート番号を取得するフック
export const useOtlpReceiverPort = (): number => {
  const [port, setPort] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadPort = (allowRetry: boolean): void => {
      window.electronAPI.aiCodingTelemetry
        .getReceiverPort()
        .then((nextPort) => {
          if (!cancelled) setPort(nextPort);
        })
        .catch(() => {
          if (cancelled) return;
          setPort(0);
          if (allowRetry) {
            retryTimer = setTimeout(() => loadPort(false), 2000);
          }
        });
    };

    loadPort(true);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return port;
};

export const useAiCodingTelemetryReceiverStatus = (): ReceiverStatusResult => {
  const [receiverStatus, setReceiverStatus] = useState<ReceiverStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const cancelRef = useRef<{ value: boolean }>({ value: false });

  const load = useCallback((): void => {
    cancelRef.current.value = true;
    const cancelled = { value: false };
    cancelRef.current = cancelled;
    setIsLoading(true);
    window.electronAPI.aiCodingTelemetry
      .getReceiverStatus()
      .then((nextReceiverStatus) => {
        if (cancelled.value) return;
        setReceiverStatus(nextReceiverStatus);
      })
      .catch(() => {
        if (cancelled.value) return;
        setReceiverStatus(null);
      })
      .finally(() => {
        if (!cancelled.value) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.value = true;
    };
  }, [load]);

  return {
    receiverStatus,
    isLoading,
    refresh: load,
  };
};
