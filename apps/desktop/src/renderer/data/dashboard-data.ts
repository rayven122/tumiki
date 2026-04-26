import type { DashboardKpi, DashboardPeriod } from "../../main/types";

/* ===== 期間選択肢 ===== */

/** ダッシュボード期間切り替えボタンの表示順（main 側の DashboardPeriod に対応） */
export type Period = DashboardPeriod;
export const PERIODS: readonly Period[] = ["24h", "7d", "30d"] as const;

/** データ未取得時に使用するゼロ初期化済みKPI */
export const DEFAULT_KPI: DashboardKpi = {
  requests: 0,
  requestsDelta: 0,
  blocks: 0,
  blockRate: 0,
  successRate: 0,
  successRateDelta: 0,
  connectors: 0,
  connectorsDegraded: 0,
};
