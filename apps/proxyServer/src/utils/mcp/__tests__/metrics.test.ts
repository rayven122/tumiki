import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { metricsCollector, measureOperationTime } from "../metrics.js";

vi.mock("../../../libs/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../../libs/config.js", () => ({
  config: {
    metrics: {
      enabled: true,
      interval: 1000, // 短い間隔でテスト
    },
  },
}));

describe("Metrics Collection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metricsCollector.resetStats();
  });

  afterEach(() => {
    metricsCollector.stop();
  });

  describe("metricsCollector", () => {
    test("接続成功を記録できる", () => {
      const initialMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(initialMetrics.connectionSuccesses).toBe(0);

      metricsCollector.recordConnectionSuccess();

      const updatedMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(updatedMetrics.connectionSuccesses).toBe(1);
    });

    test("接続失敗を記録できる", () => {
      const initialMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(initialMetrics.connectionFailures).toBe(0);

      metricsCollector.recordConnectionFailure();

      const updatedMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(updatedMetrics.connectionFailures).toBe(1);
    });

    test("操作成功を記録できる", () => {
      const initialMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(initialMetrics.operationSuccesses).toBe(0);

      metricsCollector.recordOperationSuccess(100);

      const updatedMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(updatedMetrics.operationSuccesses).toBe(1);
      expect(updatedMetrics.avgOperationTimeMs).toBe(100);
    });

    test("操作失敗を記録できる", () => {
      const initialMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(initialMetrics.operationFailures).toBe(0);

      metricsCollector.recordOperationFailure(150);

      const updatedMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(updatedMetrics.operationFailures).toBe(1);
      expect(updatedMetrics.avgOperationTimeMs).toBe(150);
    });

    test("平均操作時間が正確に計算される", () => {
      metricsCollector.recordOperationSuccess(100);
      metricsCollector.recordOperationSuccess(200);
      metricsCollector.recordOperationFailure(300);

      const metrics = metricsCollector.getPoolMetrics(new Map());
      expect(metrics.avgOperationTimeMs).toBe(200); // (100 + 200 + 300) / 3
    });

    test("統計をリセットできる", () => {
      metricsCollector.recordConnectionSuccess();
      metricsCollector.recordOperationSuccess(100);

      let metrics = metricsCollector.getPoolMetrics(new Map());
      expect(metrics.connectionSuccesses).toBe(1);
      expect(metrics.operationSuccesses).toBe(1);

      metricsCollector.resetStats();

      metrics = metricsCollector.getPoolMetrics(new Map());
      expect(metrics.connectionSuccesses).toBe(0);
      expect(metrics.operationSuccesses).toBe(0);
      expect(metrics.avgOperationTimeMs).toBe(0);
    });

    test("プールメトリクスが正確に取得される", () => {
      const mockConnectionPools = new Map([
        ["pool1", [{ isActive: true }, { isActive: false }]],
        [
          "pool2",
          [{ isActive: true }, { isActive: true }, { isActive: false }],
        ],
      ]);

      metricsCollector.recordConnectionSuccess();
      metricsCollector.recordConnectionFailure();
      metricsCollector.recordOperationSuccess(100);

      const metrics = metricsCollector.getPoolMetrics(mockConnectionPools);

      expect(metrics.totalConnections).toBe(5);
      expect(metrics.activeConnections).toBe(3);
      expect(metrics.idleConnections).toBe(2);
      expect(metrics.poolCount).toBe(2);
      expect(metrics.connectionSuccesses).toBe(1);
      expect(metrics.connectionFailures).toBe(1);
      expect(metrics.operationSuccesses).toBe(1);
    });
  });

  describe("measureOperationTime", () => {
    test("成功した操作の時間を測定できる", async () => {
      const mockOperation = vi.fn().mockResolvedValue("success");
      const mockOnSuccess = vi.fn();
      const mockOnFailure = vi.fn();

      const result = await measureOperationTime(
        mockOperation,
        mockOnSuccess,
        mockOnFailure,
      );

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledOnce();
      expect(mockOnSuccess).toHaveBeenCalledOnce();
      expect(mockOnFailure).not.toHaveBeenCalled();
      expect(typeof mockOnSuccess.mock.calls[0]?.[0]).toBe("number"); // duration が渡される
    });

    test("失敗した操作の時間を測定できる", async () => {
      const error = new Error("operation failed");
      const mockOperation = vi.fn().mockRejectedValue(error);
      const mockOnSuccess = vi.fn();
      const mockOnFailure = vi.fn();

      await expect(
        measureOperationTime(mockOperation, mockOnSuccess, mockOnFailure),
      ).rejects.toThrow("operation failed");

      expect(mockOperation).toHaveBeenCalledOnce();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnFailure).toHaveBeenCalledOnce();
      expect(typeof mockOnFailure.mock.calls[0]?.[0]).toBe("number"); // duration が渡される
    });

    test("コールバック関数なしでも動作する", async () => {
      const mockOperation = vi.fn().mockResolvedValue("success");

      const result = await measureOperationTime(mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledOnce();
    });

    test("メトリクス統計が自動的に記録される", async () => {
      const mockOperation = vi.fn().mockResolvedValue("success");

      const initialMetrics = metricsCollector.getPoolMetrics(new Map());
      const initialSuccesses = initialMetrics.operationSuccesses;

      await measureOperationTime(mockOperation);

      const updatedMetrics = metricsCollector.getPoolMetrics(new Map());
      expect(updatedMetrics.operationSuccesses).toBe(initialSuccesses + 1);
    });
  });
});
