import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (n: string) => (n === "userData" ? "/test/userData" : "/test"),
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../../../shared/app-store");
vi.mock("../ai-coding-telemetry.repository");
vi.mock("../ai-coding-telemetry.config-writer");

import * as service from "../ai-coding-telemetry.service";
import { getDb } from "../../../shared/db";
import { getAppStore } from "../../../shared/app-store";
import * as repository from "../ai-coding-telemetry.repository";
import { applyOtlpToTool } from "../ai-coding-telemetry.config-writer";

const mockDb = {} as ReturnType<typeof getDb> extends Promise<infer T>
  ? T
  : never;
const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
} as unknown as Awaited<ReturnType<typeof getAppStore>>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDb).mockResolvedValue(mockDb);
  vi.mocked(getAppStore).mockResolvedValue(mockStore);
  vi.mocked(mockStore.get).mockReturnValue(undefined);
  vi.mocked(repository.storeMetrics).mockResolvedValue(undefined);
  vi.mocked(repository.storeTraces).mockResolvedValue(undefined);
  vi.mocked(repository.getSummary).mockResolvedValue([]);
  vi.mocked(repository.getDailyUsage).mockResolvedValue([]);
  vi.mocked(repository.deleteOldMetrics).mockResolvedValue(0);
  vi.mocked(repository.deleteOldTraces).mockResolvedValue(0);
});

describe("storeOtlpMetrics", () => {
  test("null は無視されて何も保存しない", async () => {
    await service.storeOtlpMetrics(null);
    expect(repository.storeMetrics).not.toHaveBeenCalled();
  });

  test("文字列は無視されて何も保存しない", async () => {
    await service.storeOtlpMetrics("invalid");
    expect(repository.storeMetrics).not.toHaveBeenCalled();
  });

  test("resourceMetrics が配列でない場合は早期リターン", async () => {
    await service.storeOtlpMetrics({ resourceMetrics: "not-array" });
    expect(repository.storeMetrics).not.toHaveBeenCalled();
  });

  test("resourceMetrics が空配列の場合は保存しない", async () => {
    await service.storeOtlpMetrics({ resourceMetrics: [] });
    expect(repository.storeMetrics).not.toHaveBeenCalled();
  });

  test("dataPoints がない metric は無視される", async () => {
    await service.storeOtlpMetrics({
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "claude-code" } },
            ],
          },
          scopeMetrics: [
            { metrics: [{ name: "test", sum: { dataPoints: [] } }] },
          ],
        },
      ],
    });
    expect(repository.storeMetrics).not.toHaveBeenCalled();
  });

  test("正常な OTLP メトリクスを解析して保存する", async () => {
    await service.storeOtlpMetrics({
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "claude-code" } },
            ],
          },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "claude_code_tokens_total",
                  sum: { dataPoints: [{ asDouble: 1500, attributes: [] }] },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(repository.storeMetrics).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({
        tool: "claude-code",
        metricName: "claude_code_tokens_total",
        value: 1500,
      }),
    ]);
  });

  test("service.name が存在しない場合は tool が unknown になる", async () => {
    await service.storeOtlpMetrics({
      resourceMetrics: [
        {
          resource: { attributes: [] },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "test_metric",
                  sum: { dataPoints: [{ asDouble: 100 }] },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(repository.storeMetrics).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({ tool: "unknown" }),
    ]);
  });

  test("service.name が長すぎる場合は 128 文字に切り詰める", async () => {
    const longToolName = "x".repeat(200);

    await service.storeOtlpMetrics({
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: longToolName } },
            ],
          },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "test_metric",
                  sum: { dataPoints: [{ asDouble: 100 }] },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(repository.storeMetrics).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({ tool: "x".repeat(128) }),
    ]);
  });

  test("gauge 型のメトリクスも解析できる", async () => {
    await service.storeOtlpMetrics({
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "codex" } },
            ],
          },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "codex_cpu",
                  gauge: { dataPoints: [{ asDouble: 42 }] },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(repository.storeMetrics).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({
        tool: "codex",
        metricName: "codex_cpu",
        value: 42,
      }),
    ]);
  });

  test("dataPoint に attributes がある場合は JSON 文字列で保存される", async () => {
    const attrs = [{ key: "type", value: { stringValue: "input" } }];
    await service.storeOtlpMetrics({
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "claude-code" } },
            ],
          },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "tokens",
                  sum: { dataPoints: [{ asDouble: 100, attributes: attrs }] },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(repository.storeMetrics).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({ attributes: JSON.stringify(attrs) }),
    ]);
  });
});

describe("storeOtlpTraces", () => {
  test("null は無視される", async () => {
    await service.storeOtlpTraces(null);
    expect(repository.storeTraces).not.toHaveBeenCalled();
  });

  test("resourceSpans が配列でない場合は早期リターン", async () => {
    await service.storeOtlpTraces({ resourceSpans: "invalid" });
    expect(repository.storeTraces).not.toHaveBeenCalled();
  });

  test("spans が空配列の場合は保存しない", async () => {
    await service.storeOtlpTraces({
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [{ spans: [] }],
        },
      ],
    });
    expect(repository.storeTraces).not.toHaveBeenCalled();
  });

  test("正常な OTLP トレースを解析して保存する", async () => {
    await service.storeOtlpTraces({
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "claude-code" } },
            ],
          },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: "abc123",
                  name: "llm.call",
                  startTimeUnixNano: "1000000000",
                  endTimeUnixNano: "2000000000",
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(repository.storeTraces).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({
        tool: "claude-code",
        traceId: "abc123",
        spanName: "llm.call",
        durationMs: 1000,
      }),
    ]);
  });

  test("durationMs が負にならない（endTime < startTime のケース）", async () => {
    await service.storeOtlpTraces({
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: "x",
                  name: "span",
                  startTimeUnixNano: "2000000000",
                  endTimeUnixNano: "1000000000",
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(repository.storeTraces).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({ durationMs: 0 }),
    ]);
  });
});

describe("getSummary", () => {
  test("指定日数前の日付で repository を呼び出す", async () => {
    const before = Date.now();
    await service.getSummary({ days: 7 });
    const after = Date.now();
    expect(repository.getSummary).toHaveBeenCalledWith(
      mockDb,
      expect.any(Date),
    );
    const [[, since]] = vi.mocked(repository.getSummary).mock.calls as [
      [unknown, Date],
    ];
    expect(since.getTime()).toBeGreaterThanOrEqual(before - 7 * 86400_000 - 10);
    expect(since.getTime()).toBeLessThanOrEqual(after - 7 * 86400_000 + 10);
  });
});

describe("getDailyUsage", () => {
  test("指定日数前の日付で repository を呼び出す", async () => {
    await service.getDailyUsage({ days: 30 });
    expect(repository.getDailyUsage).toHaveBeenCalledWith(
      mockDb,
      expect.any(Date),
    );
  });
});

describe("getToolSettings", () => {
  test("electron-store に設定がない場合はデフォルト値を返す", async () => {
    vi.mocked(mockStore.get).mockReturnValue(undefined);
    const result = await service.getToolSettings("claude-code");
    expect(result).toStrictEqual({
      tool: "claude-code",
      enabled: false,
      appliedAt: undefined,
      appliedPort: undefined,
    });
  });

  test("electron-store の設定を返す", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      tools: {
        "claude-code": {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 4318,
        },
      },
    });
    const result = await service.getToolSettings("claude-code");
    expect(result).toStrictEqual({
      tool: "claude-code",
      enabled: true,
      appliedAt: "2026-01-01T00:00:00.000Z",
      appliedPort: 4318,
    });
  });
});

describe("saveToolEnabled", () => {
  test("有効フラグを electron-store に保存する", async () => {
    vi.mocked(mockStore.get).mockReturnValue({ tools: {} });
    await service.saveToolEnabled("codex", true);
    expect(mockStore.set).toHaveBeenCalledWith(
      "aiCodingTelemetry",
      expect.objectContaining({
        tools: expect.objectContaining({
          codex: expect.objectContaining({ enabled: true }),
        }),
      }),
    );
  });

  test("既存の receiverPort を保持したまま更新する", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      receiverPort: 4318,
      tools: {},
    });
    await service.saveToolEnabled("claude-code", true);
    const [[, saved]] = vi.mocked(mockStore.set).mock.calls as unknown as [
      [string, Record<string, unknown>],
    ];
    expect(saved.receiverPort).toStrictEqual(4318);
  });
});

describe("applyToolSettings", () => {
  test("config-writer が成功した場合は electron-store を更新する", async () => {
    vi.mocked(applyOtlpToTool).mockResolvedValue({
      success: true,
      configPath: "/path/to/config",
    });
    vi.mocked(mockStore.get).mockReturnValue({ tools: {} });
    const result = await service.applyToolSettings({
      tool: "claude-code",
      port: 4318,
    });
    expect(result.success).toStrictEqual(true);
    expect(mockStore.set).toHaveBeenCalled();
  });

  test("既存の receiverPort を保持したまま更新する", async () => {
    vi.mocked(applyOtlpToTool).mockResolvedValue({
      success: true,
      configPath: "/path/to/config",
    });
    vi.mocked(mockStore.get).mockReturnValue({
      receiverPort: 4318,
      tools: {},
    });
    await service.applyToolSettings({ tool: "claude-code", port: 4318 });
    const [[, saved]] = vi.mocked(mockStore.set).mock.calls as unknown as [
      [string, Record<string, unknown>],
    ];
    expect(saved.receiverPort).toStrictEqual(4318);
  });

  test("config-writer が失敗した場合は electron-store を更新しない", async () => {
    vi.mocked(applyOtlpToTool).mockResolvedValue({
      success: false,
      configPath: null,
      errorCode: "WRITE_FAILED",
    });
    const result = await service.applyToolSettings({
      tool: "claude-code",
      port: 4318,
    });
    expect(result.success).toStrictEqual(false);
    expect(mockStore.set).not.toHaveBeenCalled();
  });
});

describe("autoReapplyMismatchedPorts", () => {
  test("適用済みツールでポートが異なる場合は再書き込みする", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      receiverPort: 5000,
      tools: {
        "claude-code": {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 4318,
        },
      },
    });
    vi.mocked(applyOtlpToTool).mockResolvedValue({
      success: true,
      configPath: "/path/to/config",
    });

    await service.autoReapplyMismatchedPorts(5000);

    expect(applyOtlpToTool).toHaveBeenCalledWith("claude-code", 5000);
    expect(mockStore.set).toHaveBeenCalled();
  });

  test("適用済みでもポートが一致していれば再書き込みしない", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      tools: {
        "claude-code": {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 4318,
        },
      },
    });

    await service.autoReapplyMismatchedPorts(4318);

    expect(applyOtlpToTool).not.toHaveBeenCalled();
    expect(mockStore.set).not.toHaveBeenCalled();
  });

  test("未適用ツール（appliedAt が無い）はスキップする", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      tools: {
        "claude-code": { enabled: true },
      },
    });

    await service.autoReapplyMismatchedPorts(5000);

    expect(applyOtlpToTool).not.toHaveBeenCalled();
  });

  test("複数ツールのうち不一致のものだけ再書き込みする", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      tools: {
        "claude-code": {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 4318,
        },
        codex: {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 5000,
        },
      },
    });
    vi.mocked(applyOtlpToTool).mockResolvedValue({
      success: true,
      configPath: "/path",
    });

    await service.autoReapplyMismatchedPorts(5000);

    expect(applyOtlpToTool).toHaveBeenCalledTimes(1);
    expect(applyOtlpToTool).toHaveBeenCalledWith("claude-code", 5000);
  });

  test("config-writer が失敗した場合は store を更新しない", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      tools: {
        "claude-code": {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 4318,
        },
      },
    });
    vi.mocked(applyOtlpToTool).mockResolvedValue({
      success: false,
      configPath: null,
      errorCode: "WRITE_FAILED",
    });

    await service.autoReapplyMismatchedPorts(5000);

    expect(applyOtlpToTool).toHaveBeenCalled();
    expect(mockStore.set).not.toHaveBeenCalled();
  });

  test("electron-store の未知のツールキーはスキップする", async () => {
    vi.mocked(mockStore.get).mockReturnValue({
      tools: {
        // 過去バージョンが書いた未知ツール（型上は弾けない）
        "unknown-tool": {
          enabled: true,
          appliedAt: "2026-01-01T00:00:00.000Z",
          appliedPort: 4318,
        },
      },
    });

    await service.autoReapplyMismatchedPorts(5000);

    expect(applyOtlpToTool).not.toHaveBeenCalled();
    expect(mockStore.set).not.toHaveBeenCalled();
  });
});

describe("pruneOldTelemetry", () => {
  test("デフォルトでは 90 日より古いメトリクス・トレースを削除する", async () => {
    vi.mocked(repository.deleteOldMetrics).mockResolvedValue(10);
    vi.mocked(repository.deleteOldTraces).mockResolvedValue(3);

    const before = Date.now();
    const result = await service.pruneOldTelemetry();
    const after = Date.now();

    expect(result).toStrictEqual({ metrics: 10, traces: 3 });
    expect(repository.deleteOldMetrics).toHaveBeenCalledWith(
      mockDb,
      expect.any(Date),
    );
    expect(repository.deleteOldTraces).toHaveBeenCalledWith(
      mockDb,
      expect.any(Date),
    );

    // cutoff が およそ 90 日前を指していることを検証
    const [[, cutoff]] = vi.mocked(repository.deleteOldMetrics).mock.calls as [
      [unknown, Date],
    ];
    const ninetyDaysMs = 90 * 86400_000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(
      before - ninetyDaysMs - 100,
    );
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - ninetyDaysMs + 100);
  });

  test("retentionDays を指定するとその日数前を cutoff にする", async () => {
    vi.mocked(repository.deleteOldMetrics).mockResolvedValue(0);
    vi.mocked(repository.deleteOldTraces).mockResolvedValue(0);

    const before = Date.now();
    await service.pruneOldTelemetry(7);
    const after = Date.now();

    const [[, cutoff]] = vi.mocked(repository.deleteOldMetrics).mock.calls as [
      [unknown, Date],
    ];
    const sevenDaysMs = 7 * 86400_000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - sevenDaysMs - 100);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - sevenDaysMs + 100);
  });

  test("削除件数 0 でも例外を投げず { metrics: 0, traces: 0 } を返す", async () => {
    vi.mocked(repository.deleteOldMetrics).mockResolvedValue(0);
    vi.mocked(repository.deleteOldTraces).mockResolvedValue(0);

    const result = await service.pruneOldTelemetry();

    expect(result).toStrictEqual({ metrics: 0, traces: 0 });
  });
});
