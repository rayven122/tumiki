import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AiCodingTool,
  DailyUsageItem,
  GetToolSettingsResult,
  TelemetrySummaryItem,
} from "../../main/types";

type SummaryResult = {
  data: TelemetrySummaryItem[] | null;
  isLoading: boolean;
};
type DailyUsageResult = { data: DailyUsageItem[] | null; isLoading: boolean };
type ToolSettingsResult = {
  settings: GetToolSettingsResult | null;
  isLoading: boolean;
  refresh: () => void;
};

// 指定期間のサマリーを取得するフック
export const useAiCodingTelemetrySummary = (days = 7): SummaryResult => {
  const [data, setData] = useState<TelemetrySummaryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setIsLoading(true);

    window.electronAPI.aiCodingTelemetry
      .getSummary(days)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  return { data, isLoading };
};

// 指定期間の日別使用量を取得するフック
export const useAiCodingTelemetryDailyUsage = (days = 30): DailyUsageResult => {
  const [data, setData] = useState<DailyUsageItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setIsLoading(true);

    window.electronAPI.aiCodingTelemetry
      .getDailyUsage(days)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  return { data, isLoading };
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
    window.electronAPI.aiCodingTelemetry
      .getReceiverPort()
      .then(setPort)
      .catch(() => setPort(0));
  }, []);

  return port;
};
