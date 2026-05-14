import { getDb } from "../../shared/db";
import { getAppStore } from "../../shared/app-store";
import * as logger from "../../shared/utils/logger";
import * as repository from "./ai-coding-telemetry.repository";
import { applyOtlpToTool } from "./ai-coding-telemetry.config-writer";
import { isAiCodingTool } from "./ai-coding-telemetry.types";
import type {
  AiCodingTool,
  ApplyToolSettingsInput,
  ApplyToolSettingsResult,
  DailyUsageItem,
  GetDailyUsageInput,
  GetSummaryInput,
  GetToolSettingsResult,
  MetricRecord,
  TelemetrySummaryItem,
  TraceRecord,
} from "./ai-coding-telemetry.types";

const MAX_TOOL_NAME_LENGTH = 128;
const MAX_RECORD_FIELD_LENGTH = 255;
const MAX_ATTRIBUTES_LENGTH = 4096;

const truncateString = (value: string, maxLength: number): string =>
  value.length > maxLength ? value.slice(0, maxLength) : value;

// OTLP JSON の resource.attributes から service.name を安全に抽出する
const extractToolName = (resourceMetric: unknown): string => {
  if (typeof resourceMetric !== "object" || resourceMetric === null)
    return "unknown";
  const rm = resourceMetric as Record<string, unknown>;
  const resource = rm.resource;
  if (typeof resource !== "object" || resource === null) return "unknown";
  const attrs = (resource as Record<string, unknown>).attributes;
  if (!Array.isArray(attrs)) return "unknown";
  for (const attr of attrs) {
    if (typeof attr !== "object" || attr === null) continue;
    const a = attr as Record<string, unknown>;
    if (a.key === "service.name") {
      const val = a.value as Record<string, unknown> | undefined;
      const str = val?.stringValue;
      if (typeof str === "string")
        return truncateString(str, MAX_TOOL_NAME_LENGTH);
    }
  }
  return "unknown";
};

// OTLP dataPoint から数値を安全に抽出する
const extractDataPointValue = (dataPoint: unknown): number => {
  if (typeof dataPoint !== "object" || dataPoint === null) return 0;
  const dp = dataPoint as Record<string, unknown>;
  const v = dp.asDouble ?? dp.asInt;
  return typeof v === "number" ? v : 0;
};

// OTLP dataPoint の attributes を JSON 文字列で返す
const extractAttributes = (dataPoint: unknown): string | undefined => {
  if (typeof dataPoint !== "object" || dataPoint === null) return undefined;
  const dp = dataPoint as Record<string, unknown>;
  if (!Array.isArray(dp.attributes) || dp.attributes.length === 0)
    return undefined;
  try {
    return truncateString(JSON.stringify(dp.attributes), MAX_ATTRIBUTES_LENGTH);
  } catch {
    return undefined;
  }
};

// OTLP /v1/metrics ペイロードを解析して DB に保存する
export const storeOtlpMetrics = async (body: unknown): Promise<void> => {
  if (typeof body !== "object" || body === null) return;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.resourceMetrics)) return;

  const metrics: MetricRecord[] = [];

  for (const rm of b.resourceMetrics) {
    if (typeof rm !== "object" || rm === null) continue;
    const tool = extractToolName(rm);
    const scopeMetrics = (rm as Record<string, unknown>).scopeMetrics;
    if (!Array.isArray(scopeMetrics)) continue;

    for (const sm of scopeMetrics) {
      if (typeof sm !== "object" || sm === null) continue;
      const smMetrics = (sm as Record<string, unknown>).metrics;
      if (!Array.isArray(smMetrics)) continue;

      for (const metric of smMetrics) {
        if (typeof metric !== "object" || metric === null) continue;
        const m = metric as Record<string, unknown>;
        const metricName =
          typeof m.name === "string"
            ? truncateString(m.name, MAX_RECORD_FIELD_LENGTH)
            : "unknown";
        const dataPointContainer = m.sum ?? m.gauge;
        if (
          typeof dataPointContainer !== "object" ||
          dataPointContainer === null
        )
          continue;
        const dataPoints = (dataPointContainer as Record<string, unknown>)
          .dataPoints;
        if (!Array.isArray(dataPoints)) continue;

        for (const dp of dataPoints) {
          metrics.push({
            tool,
            metricName,
            value: extractDataPointValue(dp),
            attributes: extractAttributes(dp),
          });
        }
      }
    }
  }

  if (metrics.length === 0) return;
  const db = await getDb();
  await repository.storeMetrics(db, metrics);
};

// OTLP /v1/traces ペイロードを解析して DB に保存する
export const storeOtlpTraces = async (body: unknown): Promise<void> => {
  if (typeof body !== "object" || body === null) return;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.resourceSpans)) return;

  const traces: TraceRecord[] = [];

  for (const rs of b.resourceSpans) {
    if (typeof rs !== "object" || rs === null) continue;
    const tool = extractToolName(rs);
    const scopeSpans = (rs as Record<string, unknown>).scopeSpans;
    if (!Array.isArray(scopeSpans)) continue;

    for (const ss of scopeSpans) {
      if (typeof ss !== "object" || ss === null) continue;
      const spans = (ss as Record<string, unknown>).spans;
      if (!Array.isArray(spans)) continue;

      for (const span of spans) {
        if (typeof span !== "object" || span === null) continue;
        const s = span as Record<string, unknown>;
        const traceId =
          typeof s.traceId === "string"
            ? truncateString(s.traceId, MAX_RECORD_FIELD_LENGTH)
            : "unknown";
        const spanName =
          typeof s.name === "string"
            ? truncateString(s.name, MAX_RECORD_FIELD_LENGTH)
            : "unknown";
        // OTLP の時刻は Unix ナノ秒の文字列
        const startNs =
          typeof s.startTimeUnixNano === "string"
            ? BigInt(s.startTimeUnixNano)
            : 0n;
        const endNs =
          typeof s.endTimeUnixNano === "string"
            ? BigInt(s.endTimeUnixNano)
            : 0n;
        const durationMs = Number((endNs - startNs) / 1_000_000n);
        traces.push({
          tool,
          traceId,
          spanName,
          durationMs: Math.max(0, durationMs),
          attributes:
            Array.isArray(s.attributes) && s.attributes.length > 0
              ? truncateString(
                  JSON.stringify(s.attributes),
                  MAX_ATTRIBUTES_LENGTH,
                )
              : undefined,
        });
      }
    }
  }

  if (traces.length === 0) return;
  const db = await getDb();
  await repository.storeTraces(db, traces);
};

// 指定期間のサマリーを返す
export const getSummary = async (
  input: GetSummaryInput,
): Promise<TelemetrySummaryItem[]> => {
  const since = new Date(Date.now() - input.days * 86400_000);
  const db = await getDb();
  return repository.getSummary(db, since);
};

// 指定期間の日別使用量を返す
export const getDailyUsage = async (
  input: GetDailyUsageInput,
): Promise<DailyUsageItem[]> => {
  const since = new Date(Date.now() - input.days * 86400_000);
  const db = await getDb();
  return repository.getDailyUsage(db, since);
};

// ツールの設定ファイルに OTLP env vars を書き込み、electron-store に記録する
export const applyToolSettings = async (
  input: ApplyToolSettingsInput,
): Promise<ApplyToolSettingsResult> => {
  const result = await applyOtlpToTool(input.tool, input.port);
  if (result.success) {
    const store = await getAppStore();
    const current = store.get("aiCodingTelemetry") ?? { tools: {} };
    store.set("aiCodingTelemetry", {
      ...current,
      tools: {
        ...current.tools,
        [input.tool]: {
          ...(current.tools[input.tool] ?? { enabled: true }),
          appliedAt: new Date().toISOString(),
          appliedPort: input.port,
        },
      },
    });
  }
  return result;
};

// ツールのテレメトリ設定を electron-store から返す
export const getToolSettings = async (
  tool: AiCodingTool,
): Promise<GetToolSettingsResult> => {
  const store = await getAppStore();
  const current = store.get("aiCodingTelemetry");
  const settings = current?.tools?.[tool];
  return {
    tool,
    enabled: settings?.enabled ?? false,
    appliedAt: settings?.appliedAt,
    appliedPort: settings?.appliedPort,
  };
};

// 指定日数より古いメトリクス・トレースを削除する（デフォルト 90 日）。
// 起動時に呼び出すことで、SQLite が長期的に肥大化するのを防ぐ。
// 戻り値はメトリクス・トレースそれぞれの削除件数。
export const pruneOldTelemetry = async (
  retentionDays: number = 90,
): Promise<{ metrics: number; traces: number }> => {
  const db = await getDb();
  const cutoff = new Date(Date.now() - retentionDays * 86400_000);
  const [metrics, traces] = await Promise.all([
    repository.deleteOldMetrics(db, cutoff),
    repository.deleteOldTraces(db, cutoff),
  ]);
  if (metrics > 0 || traces > 0) {
    logger.info("古いAIコーディングテレメトリを削除しました", {
      retentionDays,
      metrics,
      traces,
    });
  }
  return { metrics, traces };
};

// OTLP レシーバーのポートが前回と変わった場合、適用済みツールの設定ファイルを
// 現在のポートで再書き込みする。
// 起動時に呼び出すことで、ポート変更後も Tumiki と設定ファイルの整合性を保つ。
// 戻り値: 実際に再書き込みできたツールの一覧（トースト表示用）
export const autoReapplyMismatchedPorts = async (
  currentPort: number,
): Promise<AiCodingTool[]> => {
  const store = await getAppStore();
  const current = store.get("aiCodingTelemetry");
  const tools = current?.tools ?? {};
  const reapplied: AiCodingTool[] = [];

  for (const [toolKey, settings] of Object.entries(tools)) {
    // electron-store は外部入力扱いとし、未知のキーは無視する
    if (!isAiCodingTool(toolKey)) {
      logger.warn("保存済み設定に未知のツールキーがあるためスキップします", {
        toolKey,
      });
      continue;
    }
    const tool = toolKey;
    // 過去に書き込み実績があり、かつポートが現在と異なる場合のみ再適用
    if (!settings?.appliedAt) continue;
    if (settings.appliedPort === currentPort) continue;

    logger.info("ポート変更のためツール設定を再適用します", {
      tool,
      oldPort: settings.appliedPort,
      newPort: currentPort,
    });

    const result = await applyOtlpToTool(tool, currentPort);
    if (result.success) {
      // electron-store を最新ポートで更新
      const latest = store.get("aiCodingTelemetry") ?? { tools: {} };
      store.set("aiCodingTelemetry", {
        ...latest,
        tools: {
          ...latest.tools,
          [tool]: {
            ...(latest.tools[tool] ?? { enabled: true }),
            appliedAt: new Date().toISOString(),
            appliedPort: currentPort,
          },
        },
      });
      reapplied.push(tool);
      logger.info("ツール設定の再適用が完了しました", { tool, currentPort });
    } else {
      logger.warn("ツール設定の再適用に失敗しました", {
        tool,
        errorCode: result.errorCode,
      });
    }
  }

  return reapplied;
};

// ツールのテレメトリ有効フラグを electron-store に保存する
export const saveToolEnabled = async (
  tool: AiCodingTool,
  enabled: boolean,
): Promise<void> => {
  const store = await getAppStore();
  const current = store.get("aiCodingTelemetry") ?? { tools: {} };
  store.set("aiCodingTelemetry", {
    ...current,
    tools: {
      ...current.tools,
      [tool]: {
        ...(current.tools[tool] ?? {}),
        enabled,
      },
    },
  });
};
