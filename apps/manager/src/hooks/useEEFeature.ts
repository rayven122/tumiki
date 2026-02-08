"use client";

import { api } from "@/trpc/react";
import type { EEFeature, EEFeatureInfo } from "@/features/ee";

/**
 * 全EE機能の情報を取得するフック
 *
 * サーバーからEE機能の利用可否を取得し、
 * EE版が有効かどうかと各機能の状態を返す。
 */
export const useEEFeatures = (): {
  eeAvailable: boolean;
  features: EEFeatureInfo[];
  isLoading: boolean;
  error: ReturnType<typeof api.v2.system.checkEEFeature.useQuery>["error"];
} => {
  const { data, isLoading, error } = api.v2.system.checkEEFeature.useQuery({});

  // 全機能情報を返す場合の型ガード
  const isAllFeaturesResult = (
    result: typeof data,
  ): result is {
    eeAvailable: boolean;
    features: EEFeatureInfo[];
  } => {
    return result !== undefined && "eeAvailable" in result;
  };

  if (isAllFeaturesResult(data)) {
    return {
      eeAvailable: data.eeAvailable,
      features: data.features,
      isLoading,
      error,
    };
  }

  return {
    eeAvailable: false,
    features: [],
    isLoading,
    error,
  };
};

/**
 * 特定のEE機能が利用可能かどうかをチェックするフック
 *
 * @param feature - チェックするEE機能
 * @returns 機能が利用可能かどうかと読み込み状態
 */
export const useIsEEFeatureAvailable = (feature: EEFeature) => {
  const { data, isLoading, error } = api.v2.system.checkEEFeature.useQuery({
    feature,
  });

  // 特定機能のチェック結果を返す場合の型ガード
  const isSingleFeatureResult = (
    result: typeof data,
  ): result is { feature: EEFeature; available: boolean } => {
    return result !== undefined && "feature" in result && "available" in result;
  };

  if (isSingleFeatureResult(data)) {
    return {
      available: data.available,
      isLoading,
      error,
    };
  }

  return {
    available: false,
    isLoading,
    error,
  };
};

/**
 * EE機能が無効な場合にフォールバック値を返すフック
 *
 * @param feature - チェックするEE機能
 * @param enabledValue - EE機能が有効な場合に返す値
 * @param fallbackValue - EE機能が無効な場合に返す値
 * @returns EE機能の状態に応じた値
 */
export const useEEFeatureValue = <T>(
  feature: EEFeature,
  enabledValue: T,
  fallbackValue: T,
): { value: T; isLoading: boolean } => {
  const { available, isLoading } = useIsEEFeatureAvailable(feature);

  return {
    value: available ? enabledValue : fallbackValue,
    isLoading,
  };
};
