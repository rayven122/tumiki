// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useAiCodingToolSettings,
  useOtlpReceiverPort,
  useAiCodingTelemetryBackground,
} from "../useAiCodingTelemetry";

// electronAPI のモック
const mockGetToolSettings = vi.fn();
const mockGetReceiverPort = vi.fn();
const mockGetReceiverStatus = vi.fn();
const mockGetBackgroundStatus = vi.fn();
const mockSetBackgroundCollectionEnabled = vi.fn();
const mockSaveToolEnabled = vi.fn();

// electronAPI を window に直接追加（window 全体の置き換えは React を壊すため回避）
Object.defineProperty(window, "electronAPI", {
  value: {
    aiCodingTelemetry: {
      getToolSettings: mockGetToolSettings,
      getReceiverPort: mockGetReceiverPort,
      getReceiverStatus: mockGetReceiverStatus,
      getBackgroundStatus: mockGetBackgroundStatus,
      setBackgroundCollectionEnabled: mockSetBackgroundCollectionEnabled,
      saveToolEnabled: mockSaveToolEnabled,
    },
  },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBackgroundStatus.mockResolvedValue({
    supported: true,
    enabled: false,
    installed: false,
    loaded: false,
    port: 4318,
  });
  mockGetReceiverStatus.mockResolvedValue({
    port: 4318,
    listening: false,
    mode: "stopped",
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

  test("API エラー後に一度だけリトライする", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      mockGetReceiverPort
        .mockRejectedValueOnce(new Error("IPC error"))
        .mockResolvedValueOnce(4318);

      const { result } = renderHook(() => useOtlpReceiverPort());

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetReceiverPort).toHaveBeenCalledTimes(1);
      expect(result.current).toStrictEqual(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current).toStrictEqual(4318);
      expect(mockGetReceiverPort).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("useAiCodingTelemetryBackground", () => {
  test("バックグラウンド収集状態と受信状態を取得する", async () => {
    mockGetBackgroundStatus.mockResolvedValue({
      supported: true,
      enabled: true,
      installed: true,
      loaded: true,
      port: 4318,
    });
    mockGetReceiverStatus.mockResolvedValue({
      port: 4318,
      listening: true,
      mode: "background",
    });

    const { result } = renderHook(() => useAiCodingTelemetryBackground());

    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));
    expect(result.current.status).toStrictEqual({
      supported: true,
      enabled: true,
      installed: true,
      loaded: true,
      port: 4318,
    });
    expect(result.current.receiverStatus).toStrictEqual({
      port: 4318,
      listening: true,
      mode: "background",
    });
  });

  test("setEnabled で状態を更新する", async () => {
    mockSetBackgroundCollectionEnabled.mockResolvedValue({
      supported: true,
      enabled: true,
      installed: true,
      loaded: true,
      port: 4318,
    });
    mockGetReceiverStatus.mockResolvedValue({
      port: 4318,
      listening: true,
      mode: "background",
    });

    const { result } = renderHook(() => useAiCodingTelemetryBackground());
    await waitFor(() => expect(result.current.isLoading).toStrictEqual(false));

    act(() => {
      result.current.setEnabled(true);
    });

    await waitFor(() =>
      expect(mockSetBackgroundCollectionEnabled).toHaveBeenCalledWith(true),
    );
    await waitFor(() =>
      expect(result.current.status?.enabled).toStrictEqual(true),
    );
  });
});
