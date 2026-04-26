import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../dashboard.repository");

import * as service from "../dashboard.service";
import { getDb } from "../../../shared/db";
import * as repository from "../dashboard.repository";
import type { AuditLogSlim, ConnectorWithMeta } from "../dashboard.repository";

/** 固定の現在時刻（テストの再現性確保のため） */
const NOW = new Date("2026-04-26T12:00:00.000Z");

/** 監査ログのテスト用ファクトリ（null上書きが効くようspreadで適用） */
const createLog = (overrides: Partial<AuditLogSlim> = {}): AuditLogSlim => ({
  id: 1,
  createdAt: new Date(NOW.getTime() - 60 * 60 * 1000),
  connectionName: "Slack",
  toolName: "send_message",
  clientName: "cursor",
  isSuccess: true,
  durationMs: 100,
  ...overrides,
});

/** コネクタのテスト用ファクトリ（null上書きが効くようspreadで適用） */
const createConnector = (
  overrides: Partial<ConnectorWithMeta> = {},
): ConnectorWithMeta => ({
  serverId: 1,
  connectionId: 1,
  name: "Slack",
  iconPath: "/logos/services/slack.svg",
  serverStatus: "RUNNING",
  ...overrides,
});

describe("dashboard.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(repository.countAuditLogsInRange).mockResolvedValue({
      total: 0,
      success: 0,
    });
    vi.mocked(repository.findRecentAuditLogs).mockResolvedValue([]);
    vi.mocked(repository.findAllConnectors).mockResolvedValue([]);
    vi.mocked(repository.findAuditLogsInRange).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getDashboard", () => {
    test("空のDBに対してゼロ初期化された結果を返す", async () => {
      const result = await service.getDashboard({ period: "24h" });

      expect(result.period).toBe("24h");
      expect(result.kpi).toStrictEqual({
        requests: 0,
        requestsDelta: 0,
        blocks: 0,
        blockRate: 0,
        successRate: 0,
        successRateDelta: 0,
        connectors: 0,
        connectorsDegraded: 0,
      });
      expect(result.series).toStrictEqual([]);
      expect(result.aiClients).toStrictEqual([]);
      expect(result.connectors).toStrictEqual([]);
      expect(result.recentLogs).toStrictEqual([]);
      expect(result.timeline).toHaveLength(24);
    });

    test("KPIが正しく集計され前期比も計算される", async () => {
      const logs = [
        createLog({ id: 1, isSuccess: true }),
        createLog({ id: 2, isSuccess: true }),
        createLog({ id: 3, isSuccess: false }),
        createLog({ id: 4, isSuccess: true }),
      ];
      vi.mocked(repository.findAuditLogsInRange).mockResolvedValue(logs);
      vi.mocked(repository.countAuditLogsInRange).mockResolvedValue({
        total: 2,
        success: 1,
      });

      const result = await service.getDashboard({ period: "24h" });

      expect(result.kpi.requests).toBe(4);
      expect(result.kpi.requestsDelta).toBe(2);
      expect(result.kpi.blocks).toBe(1);
      expect(result.kpi.blockRate).toBe(25);
      expect(result.kpi.successRate).toBe(75);
      // 前期成功率は50% → 差分 +25
      expect(result.kpi.successRateDelta).toBe(25);
    });

    test("接続別の上位5件が系列として返され、6件目以降は除外される", async () => {
      const logs: AuditLogSlim[] = [];
      const names = ["A", "B", "C", "D", "E", "F"];
      names.forEach((name, idx) => {
        for (let i = 0; i <= idx; i++) {
          logs.push(createLog({ id: logs.length + 1, connectionName: name }));
        }
      });
      vi.mocked(repository.findAuditLogsInRange).mockResolvedValue(logs);

      const result = await service.getDashboard({ period: "7d" });

      expect(result.series.map((s) => s.label)).toStrictEqual([
        "F",
        "E",
        "D",
        "C",
        "B",
      ]);
      // 凡例キーは衝突しない一意なslug
      const keys = result.series.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    test("接続名がnullのログは「未指定」として集計される", async () => {
      const logs = [
        createLog({ id: 1, connectionName: null }),
        createLog({ id: 2, connectionName: null }),
      ];
      vi.mocked(repository.findAuditLogsInRange).mockResolvedValue(logs);

      const result = await service.getDashboard({ period: "24h" });

      expect(result.series).toHaveLength(1);
      expect(result.series[0]?.label).toBe("未指定");
    });

    test("AIクライアント別の構成比が割合とともに返される", async () => {
      const logs = [
        createLog({ id: 1, clientName: "cursor" }),
        createLog({ id: 2, clientName: "cursor" }),
        createLog({ id: 3, clientName: "cursor" }),
        createLog({ id: 4, clientName: "claude-code" }),
        createLog({ id: 5, clientName: null }),
      ];
      vi.mocked(repository.findAuditLogsInRange).mockResolvedValue(logs);

      const result = await service.getDashboard({ period: "24h" });

      expect(result.aiClients).toStrictEqual([
        { name: "cursor", count: 3, percentage: 75 },
        { name: "claude-code", count: 1, percentage: 25 },
      ]);
    });

    test("コネクタカードはServerStatusに応じてactive/degraded/inactiveに変換される", async () => {
      vi.mocked(repository.findAllConnectors).mockResolvedValue([
        createConnector({
          connectionId: 1,
          name: "S1",
          serverStatus: "RUNNING",
        }),
        createConnector({ connectionId: 2, name: "S2", serverStatus: "ERROR" }),
        createConnector({
          connectionId: 3,
          name: "S3",
          serverStatus: "STOPPED",
        }),
        createConnector({
          connectionId: 4,
          name: "S4",
          serverStatus: "PENDING",
        }),
      ]);

      const result = await service.getDashboard({ period: "24h" });

      expect(result.connectors.map((c) => c.status)).toStrictEqual([
        "active",
        "degraded",
        "inactive",
        "inactive",
      ]);
      expect(result.kpi.connectors).toBe(4);
      // RUNNING以外は3件
      expect(result.kpi.connectorsDegraded).toBe(3);
    });

    test("期間ごとに正しいバケット数のタイムラインが返される", async () => {
      vi.mocked(repository.findAuditLogsInRange).mockResolvedValue([]);

      const r24 = await service.getDashboard({ period: "24h" });
      const r7 = await service.getDashboard({ period: "7d" });
      const r30 = await service.getDashboard({ period: "30d" });

      expect(r24.timeline).toHaveLength(24);
      expect(r7.timeline).toHaveLength(7);
      expect(r30.timeline).toHaveLength(30);
    });

    test("now直前のログが最終バケットに集計される（境界落ち回帰防止）", async () => {
      // NOW (2026-04-26T12:00:00.000Z) = JST 2026-04-26T21:00:00 → 21:00丁度
      // システム時刻を21:30に進めて「現在進行中の時間帯」にレコードがある状態を作る
      vi.setSystemTime(new Date("2026-04-26T12:30:00.000Z"));
      const log = createLog({
        id: 1,
        connectionName: "Serena",
        createdAt: new Date("2026-04-26T12:25:00.000Z"),
      });
      vi.mocked(repository.findAuditLogsInRange).mockResolvedValue([log]);

      const result = await service.getDashboard({ period: "24h" });
      // 全バケットの合計が1件 = レコードはどこかのバケットに必ず入る
      const total = result.timeline.reduce((acc, p) => {
        const v = p.values[result.series[0]?.key ?? ""] ?? 0;
        return acc + v;
      }, 0);
      expect(total).toBe(1);
      // 最終バケットに入る（now時点を含む時間帯）
      const last = result.timeline[result.timeline.length - 1];
      expect(last?.values[result.series[0]?.key ?? ""]).toBe(1);
    });

    test("直近ログがDate→string変換されて先頭から順に返される", async () => {
      const recent = [
        createLog({
          id: 99,
          createdAt: new Date("2026-04-26T11:30:00.000Z"),
          isSuccess: true,
        }),
        createLog({
          id: 98,
          createdAt: new Date("2026-04-26T11:00:00.000Z"),
          isSuccess: false,
        }),
      ];
      vi.mocked(repository.findRecentAuditLogs).mockResolvedValue(recent);

      const result = await service.getDashboard({ period: "24h" });

      expect(result.recentLogs).toStrictEqual([
        {
          id: 99,
          createdAt: "2026-04-26T11:30:00.000Z",
          connectionName: "Slack",
          toolName: "send_message",
          clientName: "cursor",
          isSuccess: true,
          durationMs: 100,
        },
        {
          id: 98,
          createdAt: "2026-04-26T11:00:00.000Z",
          connectionName: "Slack",
          toolName: "send_message",
          clientName: "cursor",
          isSuccess: false,
          durationMs: 100,
        },
      ]);
    });

    test("repositoryへ正しい時間範囲が渡される", async () => {
      await service.getDashboard({ period: "24h" });

      const calls = vi.mocked(repository.findAuditLogsInRange).mock.calls;
      expect(calls).toHaveLength(1);
      const range = calls[0]?.[1];
      if (!range) throw new Error("findAuditLogsInRange が呼ばれていません");
      expect(range.to.getTime()).toBe(NOW.getTime());
      expect(range.to.getTime() - range.from.getTime()).toBe(
        24 * 60 * 60 * 1000,
      );

      const prevCalls = vi.mocked(repository.countAuditLogsInRange).mock.calls;
      expect(prevCalls).toHaveLength(1);
      const prevRange = prevCalls[0]?.[1];
      if (!prevRange)
        throw new Error("countAuditLogsInRange が呼ばれていません");
      // 直前24時間
      expect(prevRange.to.getTime()).toBe(range.from.getTime());
      expect(prevRange.to.getTime() - prevRange.from.getTime()).toBe(
        24 * 60 * 60 * 1000,
      );
    });
  });
});
