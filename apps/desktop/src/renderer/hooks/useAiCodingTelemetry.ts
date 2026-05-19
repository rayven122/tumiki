import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ConfigurableAiCodingTool,
  AiCodingMemberUsageItem,
  AiCodingAttributeUsageItem,
  DailyModelUsageItem,
  DailyUsageItem,
  GetToolSettingsResult,
  ListMetricLogsInput,
  ListTracesInput,
  ListTracesResult,
  ReceiverStatus,
  TelemetrySummaryItem,
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

type UsageResult = {
  summary: TelemetrySummaryItem[];
  dailyUsage: DailyUsageItem[];
  dailyModelUsage: DailyModelUsageItem[];
  modelUsage: AiCodingAttributeUsageItem[];
  memberUsage: AiCodingMemberUsageItem[];
  isLoading: boolean;
  refresh: () => void;
};

type TraceListResult = {
  result: ListTracesResult | null;
  isLoading: boolean;
  refresh: () => void;
};

type MetricToolsResult = {
  tools: string[];
  isLoading: boolean;
  refresh: () => void;
};

// ツールのテレメトリ設定を取得するフック（refresh 関数付き）
export const useAiCodingToolSettings = (
  tool: ConfigurableAiCodingTool,
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
        if (!cancelled.value) setReceiverStatus(nextReceiverStatus);
      })
      .catch(() => {
        if (!cancelled.value) setReceiverStatus(null);
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

export const useAiCodingTelemetryUsage = (days: number): UsageResult => {
  const [summary, setSummary] = useState<TelemetrySummaryItem[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageItem[]>([]);
  const [dailyModelUsage, setDailyModelUsage] = useState<DailyModelUsageItem[]>(
    [],
  );
  const [modelUsage, setModelUsage] = useState<AiCodingAttributeUsageItem[]>(
    [],
  );
  const [memberUsage, setMemberUsage] = useState<AiCodingMemberUsageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cancelRef = useRef<{ value: boolean }>({ value: false });

  const load = useCallback((): void => {
    cancelRef.current.value = true;
    const cancelled = { value: false };
    cancelRef.current = cancelled;
    setIsLoading(true);

    Promise.all([
      window.electronAPI.aiCodingTelemetry.getSummary(days),
      window.electronAPI.aiCodingTelemetry.getDailyUsage(days),
      window.electronAPI.aiCodingTelemetry.getDashboardDetails(days),
    ])
      .then(([nextSummary, nextDailyUsage, details]) => {
        if (cancelled.value) return;
        setSummary(nextSummary);
        setDailyUsage(nextDailyUsage);
        setDailyModelUsage(details.dailyModelUsage);
        setModelUsage(details.modelUsage);
        setMemberUsage(details.memberUsage);
      })
      .catch(() => {
        if (cancelled.value) return;
        setSummary([]);
        setDailyUsage([]);
        setDailyModelUsage([]);
        setModelUsage([]);
        setMemberUsage([]);
      })
      .finally(() => {
        if (!cancelled.value) setIsLoading(false);
      });
  }, [days]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.value = true;
    };
  }, [load]);

  return {
    summary,
    dailyUsage,
    dailyModelUsage,
    modelUsage,
    memberUsage,
    isLoading,
    refresh: load,
  };
};

export const useAiCodingTraceLogs = (
  input: ListTracesInput,
): TraceListResult => {
  const [result, setResult] = useState<ListTracesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cancelRef = useRef<{ value: boolean }>({ value: false });
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 20;
  const toolFilter = input.toolFilter ?? "all";
  const categoryFilter = input.categoryFilter ?? "all";
  const metricSearch = input.metricSearch;
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo;

  const load = useCallback((): void => {
    cancelRef.current.value = true;
    const cancelled = { value: false };
    cancelRef.current = cancelled;
    setIsLoading(true);

    window.electronAPI.aiCodingTelemetry
      .listMetricLogs({
        page,
        perPage,
        toolFilter,
        categoryFilter,
        metricSearch,
        dateFrom,
        dateTo,
      } satisfies ListMetricLogsInput)
      .then((nextResult) => {
        if (!cancelled.value) setResult(nextResult);
      })
      .catch(() => {
        if (!cancelled.value) setResult(null);
      })
      .finally(() => {
        if (!cancelled.value) setIsLoading(false);
      });
  }, [
    categoryFilter,
    dateFrom,
    dateTo,
    metricSearch,
    page,
    perPage,
    toolFilter,
  ]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.value = true;
    };
  }, [load]);

  return { result, isLoading, refresh: load };
};

export const useAiCodingMetricTools = (): MetricToolsResult => {
  const [tools, setTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cancelRef = useRef<{ value: boolean }>({ value: false });

  const load = useCallback((): void => {
    cancelRef.current.value = true;
    const cancelled = { value: false };
    cancelRef.current = cancelled;
    setIsLoading(true);

    window.electronAPI.aiCodingTelemetry
      .listMetricTools()
      .then((nextTools) => {
        if (!cancelled.value) setTools(nextTools);
      })
      .catch(() => {
        if (!cancelled.value) setTools([]);
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

  return { tools, isLoading, refresh: load };
};
