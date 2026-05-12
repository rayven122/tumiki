import { useState, useEffect } from "react";
import type {
  AiCodingTool,
  DailyUsageItem,
  GetToolSettingsResult,
  TelemetrySummaryItem,
} from "../../main/types";

// 指定期間のサマリーを取得するフック
export const useAiCodingTelemetrySummary = (days = 7) => {
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
export const useAiCodingTelemetryDailyUsage = (days = 30) => {
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
export const useAiCodingToolSettings = (tool: AiCodingTool) => {
  const [settings, setSettings] = useState<GetToolSettingsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = (cancelled: { value: boolean }): void => {
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
  };

  useEffect(() => {
    const cancelled = { value: false };
    setIsLoading(true);
    load(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [tool]);

  const refresh = (): void => {
    const cancelled = { value: false };
    load(cancelled);
  };

  return { settings, isLoading, refresh };
};

// OTLP レシーバーのポート番号を取得するフック
export const useOtlpReceiverPort = () => {
  const [port, setPort] = useState<number>(0);

  useEffect(() => {
    window.electronAPI.aiCodingTelemetry
      .getReceiverPort()
      .then(setPort)
      .catch(() => setPort(0));
  }, []);

  return port;
};
