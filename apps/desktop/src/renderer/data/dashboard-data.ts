import type { DashboardPeriod } from "../../main/types";

/* ===== 期間選択肢 ===== */

/** ダッシュボード期間切り替えボタンの表示順（main 側の DashboardPeriod に対応） */
export type Period = DashboardPeriod;
export const PERIODS: readonly Period[] = ["24h", "7d", "30d"] as const;
