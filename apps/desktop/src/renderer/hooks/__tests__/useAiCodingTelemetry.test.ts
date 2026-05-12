// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useAiCodingTelemetrySummary,
  useAiCodingTelemetryDailyUsage,
  useAiCodingToolSettings,
  useOtlpReceiverPort,
} from "../useAiCodingTelemetry";

// electronAPI のモック
const mockGetSummary = vi.fn();
const mockGetDailyUsage = vi.fn();
const mockGetToolSettings = vi.fn();
const mockGetReceiverPort = vi.fn();
const mockSaveToolEnabled = vi.fn();

// electronAPI を window に直接追加（window 全体の置き換えは React を壊すため回避）
Object.defineProperty(window, "electronAPI", {
  value: {
    aiCodingTelemetry: {
      getSummary: mockGetSummary,
      getDailyUsage: mockGetDailyUsage,
      getToolSettings: mockGetToolSettings,
      getReceiverPort: mockGetReceiverPort,
      saveToolEnabled: mockSaveToolEnabled,
    },
  },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAiCodingTelemetrySummary", () => {
  test("初期状態は isLoading: true, data: null", () => {
    mockGetSummary.mockResolvedValue([]);
    const { result } = renderHook(() => useAiCodingTelemetrySummary(7));
    expect(result.current.isLoading).toStrictEqual(true);
    expect(result.current.data).toBeNull();
  });

  test("取得完了後にデータがセットされる", async () => {
    const summary = [
      { tool: "claude-code", metricName: "tokens_total", totalValue: 1000 },
    ];
    mockGetSummary.mockResolvedValue(summary);

    const { result } = renderHook(() => useAiCodingTelemetrySummary(7));

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.data).toStrictEqual(summary);
    expect(mockGetSummary).toHaveBeenCalledWith(7);
  });

  test("API エラー時は空配列を返す", async () => {
    mockGetSummary.mockRejectedValue(new Error("IPC error"));

    const { result } = renderHook(() => useAiCodingTelemetrySummary(7));

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.data).toStrictEqual([]);
  });

  test("days が変わると再取得する", async () => {
    mockGetSummary.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ days }: { days: number }) => useAiCodingTelemetrySummary(days),
      { initialProps: { days: 7 } },
    );

    await waitFor(() => expect(mockGetSummary).toHaveBeenCalledWith(7));

    rerender({ days: 30 });

    await waitFor(() => expect(mockGetSummary).toHaveBeenCalledWith(30));
    expect(mockGetSummary).toHaveBeenCalledTimes(2);
  });
});

describe("useAiCodingTelemetryDailyUsage", () => {
  test("初期状態は isLoading: true, data: null", () => {
    mockGetDailyUsage.mockResolvedValue([]);
    const { result } = renderHook(() => useAiCodingTelemetryDailyUsage(30));
    expect(result.current.isLoading).toStrictEqual(true);
    expect(result.current.data).toBeNull();
  });

  test("取得完了後にデータがセットされる", async () => {
    const usage = [
      {
        date: "2026-01-01",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: 500,
      },
    ];
    mockGetDailyUsage.mockResolvedValue(usage);

    const { result } = renderHook(() => useAiCodingTelemetryDailyUsage(30));

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.data).toStrictEqual(usage);
    expect(mockGetDailyUsage).toHaveBeenCalledWith(30);
  });

  test("API エラー時は空配列を返す", async () => {
    mockGetDailyUsage.mockRejectedValue(new Error("IPC error"));

    const { result } = renderHook(() => useAiCodingTelemetryDailyUsage(30));

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.data).toStrictEqual([]);
  });
});

describe("useAiCodingToolSettings", () => {
  test("初期状態は isLoading: true, settings: null", () => {
    mockGetToolSettings.mockResolvedValue({
      tool: "claude-code",
      enabled: false,
    });
    const { result } = renderHook(() => useAiCodingToolSettings("claude-code"));
    expect(result.current.isLoading).toStrictEqual(true);
    expect(result.current.settings).toBeNull();
  });

  test("取得完了後に settings がセットされる", async () => {
    const settings = { tool: "claude-code", enabled: true, appliedPort: 4318 };
    mockGetToolSettings.mockResolvedValue(settings);

    const { result } = renderHook(() => useAiCodingToolSettings("claude-code"));

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.settings).toStrictEqual(settings);
    expect(mockGetToolSettings).toHaveBeenCalledWith("claude-code");
  });

  test("API エラー時は settings: null のままになる", async () => {
    mockGetToolSettings.mockRejectedValue(new Error("IPC error"));

    const { result } = renderHook(() => useAiCodingToolSettings("claude-code"));

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.settings).toBeNull();
  });

  test("refresh() を呼ぶと再取得する", async () => {
    const initial = { tool: "claude-code", enabled: false };
    const updated = { tool: "claude-code", enabled: true };
    mockGetToolSettings
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useAiCodingToolSettings("claude-code"));

    await waitFor(() => expect(result.current.settings).toStrictEqual(initial));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.settings).toStrictEqual(updated));
    expect(mockGetToolSettings).toHaveBeenCalledTimes(2);
  });

  test("tool が変わると再取得する", async () => {
    mockGetToolSettings.mockResolvedValue({ tool: "codex", enabled: false });

    const { rerender } = renderHook(
      ({ tool }: { tool: "claude-code" | "codex" }) =>
        useAiCodingToolSettings(tool),
      { initialProps: { tool: "claude-code" as "claude-code" | "codex" } },
    );

    await waitFor(() =>
      expect(mockGetToolSettings).toHaveBeenCalledWith("claude-code"),
    );

    rerender({ tool: "codex" });

    await waitFor(() =>
      expect(mockGetToolSettings).toHaveBeenCalledWith("codex"),
    );
    expect(mockGetToolSettings).toHaveBeenCalledTimes(2);
  });
});

describe("useOtlpReceiverPort", () => {
  test("初期値は 0", () => {
    mockGetReceiverPort.mockResolvedValue(4318);
    const { result } = renderHook(() => useOtlpReceiverPort());
    expect(result.current).toStrictEqual(0);
  });

  test("取得後にポート番号がセットされる", async () => {
    mockGetReceiverPort.mockResolvedValue(4318);

    const { result } = renderHook(() => useOtlpReceiverPort());

    await waitFor(() => expect(result.current).toStrictEqual(4318));
  });

  test("API エラー時は 0 のまま", async () => {
    mockGetReceiverPort.mockRejectedValue(new Error("IPC error"));

    const { result } = renderHook(() => useOtlpReceiverPort());

    await waitFor(() => expect(mockGetReceiverPort).toHaveBeenCalledOnce());
    expect(result.current).toStrictEqual(0);
  });
});
