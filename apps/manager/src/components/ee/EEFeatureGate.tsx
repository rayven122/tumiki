import { isEEFeatureAvailable, type EEFeature } from "@/features/ee";
import type { ReactNode } from "react";

type EEFeatureGateProps = {
  feature: EEFeature;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * EE機能のアクセスを制御するゲートコンポーネント
 *
 * ビルド時に環境変数で判定されるため、
 * CE版ビルドではfallbackが表示される。
 */
export const EEFeatureGate = ({
  feature,
  children,
  fallback,
}: EEFeatureGateProps) => {
  const isAvailable = isEEFeatureAvailable(feature);

  if (!isAvailable) {
    return <>{fallback ?? null}</>;
  }

  return <>{children}</>;
};
