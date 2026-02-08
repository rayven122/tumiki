import { api } from "@/trpc/server";
import type { EEFeature } from "@/features/ee";
import type { ReactNode } from "react";

type EEFeatureGateProps = {
  feature: EEFeature;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * EE機能のアクセスを制御するゲートコンポーネント
 *
 * サーバーコンポーネントとして実装され、
 * 指定された機能がEE版でのみ利用可能な場合に
 * フォールバックUIを表示する。
 */
export const EEFeatureGate = async ({
  feature,
  children,
  fallback,
}: EEFeatureGateProps) => {
  const result = await api.v2.system.checkEEFeature({ feature });

  // 特定機能のチェック結果の型ガード
  const isFeatureResult = (
    data: typeof result,
  ): data is { feature: EEFeature; available: boolean } => {
    return "feature" in data && "available" in data;
  };

  // EE機能が利用不可の場合はフォールバックを表示
  if (isFeatureResult(result) && !result.available) {
    return <>{fallback ?? null}</>;
  }

  return <>{children}</>;
};
